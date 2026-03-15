import mongoose from 'mongoose';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { generateTransactionRef } from '../utils/generateTransactionRef';
import { sendTransactionNotification, sendAdminAlert } from './emailService';

export const transferFunds = async (
    senderId: string,
    receiverAccountNumber: string,
    amount: number,
    description: string,
    metadata: {
        currency?: string;
        routingProtocol?: 'Domestic' | 'International' | 'Offshore';
        swiftCode?: string;
        iban?: string;
        jurisdiction?: string;
    } = {}
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sender = await User.findById(senderId).session(session);
        if (!sender) throw new Error('Sender not found');
        if (sender.isFrozen) {
            const reason = sender.freezeReason ? `: ${sender.freezeReason}` : '';
            throw new Error(`Institutional Sequestration Active${reason}. Fund transfers are temporarily suspended during audit.`);
        }
        if (sender.accountBalance < amount) throw new Error('Insufficient balance');

        const protocol = metadata.routingProtocol || 'Domestic';
        let receiver = null;

        if (protocol === 'Domestic') {
            receiver = await User.findOne({ accountNumber: receiverAccountNumber }).session(session);
            if (!receiver) throw new Error('Beneficiary not found in the local ledger. Please verify the account number or use International routing.');
            if (receiver.accountNumber === sender.accountNumber) throw new Error('Sovereign rule violation: Self-transfers are not permitted.');
        }

        // Enforcement: Limit Protocol
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const dailyTransactions = await Transaction.find({
            sender: sender._id,
            type: 'debit',
            status: 'success',
            createdAt: { $gte: startOfDay }
        }).session(session);

        const dailyTotal = dailyTransactions.reduce((acc, tx) => acc + tx.amount, 0);

        if (dailyTotal + amount > sender.limits.dailyTransfer) {
            throw new Error(`Daily transfer limit of $${sender.limits.dailyTransfer.toLocaleString()} exceeded. Current daily total: $${dailyTotal.toLocaleString()}.`);
        }

        const referenceId = generateTransactionRef();

        // Deduct from sender
        sender.accountBalance -= amount;
        await sender.save({ session });

        // Add to receiver if domestic
        if (protocol === 'Domestic' && receiver) {
            receiver.accountBalance += amount;
            await receiver.save({ session });
        }

        const status = protocol === 'Domestic' ? 'success' : 'pending';

        const commonData = {
            amount,
            currency: metadata.currency || 'USD',
            routingProtocol: protocol,
            swiftCode: metadata.swiftCode,
            iban: metadata.iban,
            jurisdiction: metadata.jurisdiction,
            status,
            referenceId,
            receiverAccountNumber,
            detailLabel: `${protocol} // ${protocol === 'Domestic' ? 'INBOUND SETTLEMENT' : 'OUTBOUND TRANSACTION'}`, // Default logic for labels
            valueLabel: `${metadata.currency || 'USD'} // SETTLED`
        };

        // Create transactions records
        const debitTransaction = await Transaction.create([{
            ...commonData,
            sender: sender._id,
            receiver: receiver?._id,
            type: 'debit',
            description: protocol === 'Domestic' ? `Transfer to ${receiver?.name}: ${description}` : `External Transfer: ${description}`,
            detailLabel: `${protocol} // OUTBOUND TRANSACTION` // Override for debit if needed
        }], { session });

        if (protocol === 'Domestic' && receiver) {
            await Transaction.create([{
                ...commonData,
                sender: sender._id,
                receiver: receiver._id,
                type: 'credit',
                referenceId: referenceId + '-C', // Unique credit ref
                description: `Transfer from ${sender.name}: ${description}`,
            }], { session });

            // Send notification to receiver
            sendTransactionNotification(receiver.email, amount, 'credit', referenceId);
        } else {
            // High-value external alert
            sendAdminAlert(
                'External Capital Flow Initiated',
                `<p>An external routing protocol has been triggered.</p>
                 <p><strong>Amount:</strong> ${commonData.currency} ${amount.toLocaleString()}</p>
                 <p><strong>Sender:</strong> ${sender.name} (${sender.accountNumber})</p>
                 <p><strong>Recipient:</strong> ${receiverAccountNumber}</p>
                 <p><strong>Protocol:</strong> ${protocol}</p>
                 <p><strong>Status:</strong> ${status}</p>
                 <p><strong>Reference:</strong> ${referenceId}</p>`
            );
        }

        await session.commitTransaction();
        session.endSession();

        // Send notification to sender
        sendTransactionNotification(sender.email, amount, 'debit', referenceId);

        return debitTransaction[0];
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
