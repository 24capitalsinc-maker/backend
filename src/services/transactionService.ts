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

        // Clean up metadata defaults
        const currency = metadata.currency || 'USD';
        const displayJurisdiction = metadata.jurisdiction;

        const commonData = {
            amount,
            currency,
            routingProtocol: protocol,
            swiftCode: metadata.swiftCode,
            iban: metadata.iban,
            jurisdiction: displayJurisdiction,
            status,
            referenceId,
            receiverAccountNumber,
            valueLabel: `${currency} // SETTLED`
        };

        // Create transactions records
        const debitTransaction = await Transaction.create([{
            ...commonData,
            sender: sender._id,
            receiver: receiver?._id,
            type: 'debit',
            description: protocol === 'Domestic'
                ? `Transfer to ${receiver?.name || receiverAccountNumber}`
                : `${protocol} Transfer to ${receiverAccountNumber}`,
            detailLabel: `${protocol} // OUTBOUND`
        }], { session });

        if (protocol === 'Domestic' && receiver) {
            await Transaction.create([{
                ...commonData,
                sender: sender._id,
                receiver: receiver._id,
                type: 'credit',
                referenceId: referenceId + '-C', // Unique credit ref
                description: `Transfer from ${sender.name}`,
                detailLabel: `${protocol} // INBOUND`
            }], { session });

            // Send notification to receiver
            sendTransactionNotification(receiver.email, amount, 'credit', referenceId, status, protocol);
        }

        // Send informative alert to admin for all transfers
        sendAdminAlert(
            `[Capital Movement] ${sender.name} - ${commonData.currency} ${amount.toLocaleString()}`,
            `<p style="margin-top: 0;">A fund transfer has been processed.</p>
             <div style="margin: 20px 0; padding: 20px; border: 1px solid #eeeeee; background: #fafafa;">
                <p style="margin: 0; font-size: 13px;"><strong>Amount:</strong> ${commonData.currency} ${amount.toLocaleString()}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Sender:</strong> ${sender.name}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Recipient:</strong> ${receiver?.name || receiverAccountNumber}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Method:</strong> ${protocol}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Status:</strong> ${status}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Reference:</strong> ${referenceId}</p>
             </div>`
        );

        await session.commitTransaction();
        session.endSession();

        // Send notification to sender
        sendTransactionNotification(sender.email, amount, 'debit', referenceId, status, protocol);

        return debitTransaction[0];
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
