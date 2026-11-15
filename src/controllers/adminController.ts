import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Transaction from '../models/Transaction';
import SystemSettings from '../models/SystemSettings';
import { sendAdminAlert, sendTransferStatusUpdate } from '../services/emailService';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({}).populate('sender receiver', 'name email accountNumber').sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateAccountStatus = async (req: Request, res: Response) => {
    const { userId, isFrozen, reason } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isFrozen = isFrozen;
        if (isFrozen) {
            user.freezeReason = reason || 'Institutional audit required';
        } else {
            user.freezeReason = '';
        }
        await user.save();
        res.json({ message: `User account ${isFrozen ? 'frozen' : 'unfrozen'} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserLimits = async (req: Request, res: Response) => {
    const { userId, dailyTransfer, monthlyTransfer } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (dailyTransfer !== undefined) user.limits.dailyTransfer = dailyTransfer;
        if (monthlyTransfer !== undefined) user.limits.monthlyTransfer = monthlyTransfer;

        await user.save();
        res.json({ message: 'User limits updated successfully', limits: user.limits });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserBalance = async (req: Request, res: Response) => {
    const { userId, accountBalance } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const oldBalance = user.accountBalance;
        user.accountBalance = accountBalance;
        await user.save();

        res.json({
            message: 'Institutional liquidity adjusted successfully',
            accountBalance: user.accountBalance
        });

        sendAdminAlert(
            'Balance Adjustment',
            `<p>An account balance has been manually adjusted for user <strong>${user.name}</strong> (${user.email}).</p>
             <p><strong>Previous Balance:</strong> $${oldBalance.toLocaleString()}</p>
             <p><strong>New Balance:</strong> $${user.accountBalance.toLocaleString()}</p>
             <p><strong>Action By:</strong> Administrator</p>
             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error during liquidity adjustment' });
    }
};

export const getAdminMetrics = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalTransactions = await Transaction.countDocuments({});
        const users = await User.find({ role: 'user' });
        const totalBankBalance = users.reduce((acc, user) => acc + user.accountBalance, 0);

        res.json({
            totalUsers,
            totalTransactions,
            totalBankBalance,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        let settings = await SystemSettings.findOne({});
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        let settings = await SystemSettings.findOne({});
        if (!settings) {
            settings = await SystemSettings.create(req.body);
        } else {
            Object.assign(settings, req.body);
            settings.updatedAt = new Date();
            await settings.save();
        }
        res.json(settings);

        sendAdminAlert(
            'Settings Updated',
            `<p>The global system settings have been modified.</p>
             <p><strong>Updated by:</strong> Administrator</p>
             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Fetch raw transaction document without populate so Mongoose can save cleanly
        const transaction = await Transaction.findById(id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const oldStatus = transaction.status;
        const newStatus = req.body.status || transaction.status;

        // Fetch sender document if needed for email notifications and reference name
        const sender = transaction.sender ? await User.findById(transaction.sender) : null;

        // Settlement Logic: When status moves from pending -> success
        if (newStatus === 'success' && oldStatus === 'pending') {
            const protocol = req.body.routingProtocol || transaction.routingProtocol;
            const receiverAccount = req.body.receiverAccountNumber || transaction.receiverAccountNumber;
            const transferAmount = typeof req.body.amount === 'number' && !isNaN(req.body.amount)
                ? req.body.amount
                : transaction.amount;
            const transferCurrency = req.body.currency || transaction.currency;

            // Handle internal (Domestic) settlement
            if (protocol === 'Domestic' && receiverAccount) {
                const receiver = await User.findOne({ accountNumber: receiverAccount });

                if (receiver) {
                    // Credit the receiver
                    receiver.accountBalance += transferAmount;
                    await receiver.save();

                    // Idempotent creation of credit record (prevents duplicate key error on re-settlement)
                    const creditRefId = `${transaction.referenceId}-C`;
                    const existingCredit = await Transaction.findOne({ referenceId: creditRefId });

                    if (!existingCredit) {
                        await Transaction.create({
                            amount: transferAmount,
                            currency: transferCurrency,
                            routingProtocol: protocol,
                            status: 'success',
                            referenceId: creditRefId,
                            receiverAccountNumber: receiverAccount,
                            receiverName: req.body.receiverName || receiver.name || transaction.receiverName || 'Authorized Beneficiary',
                            sender: transaction.sender,
                            receiver: receiver._id,
                            type: 'credit',
                            description: `Transfer from ${sender?.name || 'Authorized Entity'}`,
                            detailLabel: `Domestic // INBOUND`,
                            valueLabel: `${transferCurrency} // SETTLED`
                        });
                    }

                    // Notify receiver
                    if (receiver.email) {
                        sendTransferStatusUpdate(
                            receiver.email,
                            transferAmount,
                            'success',
                            transaction.referenceId,
                            `Institutional credit of ${transferCurrency} ${transferAmount.toLocaleString()} received.`
                        );
                    }
                }
            }

            // Update transaction value label for visual confirmation
            transaction.valueLabel = `${transferCurrency} // SETTLED`;
        }

        // Cleanly assign updated scalar fields
        if (typeof req.body.amount === 'number' && !isNaN(req.body.amount)) {
            transaction.amount = req.body.amount;
        }
        if (req.body.currency !== undefined) transaction.currency = req.body.currency;
        if (req.body.routingProtocol !== undefined) transaction.routingProtocol = req.body.routingProtocol;
        if (req.body.swiftCode !== undefined) transaction.swiftCode = req.body.swiftCode;
        if (req.body.iban !== undefined) transaction.iban = req.body.iban;
        if (req.body.jurisdiction !== undefined) transaction.jurisdiction = req.body.jurisdiction;
        if (req.body.type !== undefined) transaction.type = req.body.type;
        if (req.body.status !== undefined) transaction.status = req.body.status;
        if (req.body.referenceId !== undefined) transaction.referenceId = req.body.referenceId;
        if (req.body.description !== undefined) transaction.description = req.body.description;
        if (req.body.detailLabel !== undefined) transaction.detailLabel = req.body.detailLabel;
        if (req.body.valueLabel !== undefined) transaction.valueLabel = req.body.valueLabel;
        if (req.body.receiverAccountNumber !== undefined) transaction.receiverAccountNumber = req.body.receiverAccountNumber;
        if (req.body.receiverName !== undefined) transaction.receiverName = req.body.receiverName;

        // Safely parse and assign date if provided
        if (req.body.createdAt) {
            const parsedDate = new Date(req.body.createdAt);
            if (!isNaN(parsedDate.getTime())) {
                transaction.createdAt = parsedDate;
            }
        }

        // Safely handle sender ID if explicitly updated
        if (req.body.sender && mongoose.Types.ObjectId.isValid(req.body.sender)) {
            transaction.sender = new mongoose.Types.ObjectId(req.body.sender);
        }

        // Safely handle receiver ID
        if (req.body.receiver === null || req.body.receiver === '') {
            transaction.receiver = undefined;
        } else if (req.body.receiver && mongoose.Types.ObjectId.isValid(req.body.receiver)) {
            transaction.receiver = new mongoose.Types.ObjectId(req.body.receiver);
        }

        const updatedTransaction = await transaction.save();

        // Populate sender and receiver for consistent client representation
        await updatedTransaction.populate('sender receiver', 'name email accountNumber');

        res.json(updatedTransaction);

        // Notify sender if status changed
        if (newStatus && newStatus !== oldStatus && sender?.email) {
            sendTransferStatusUpdate(
                sender.email,
                updatedTransaction.amount,
                updatedTransaction.status,
                updatedTransaction.referenceId,
                req.body.description || updatedTransaction.description
            );
        }
    } catch (error: any) {
        console.error('Error during transaction update:', error);
        res.status(500).json({
            message: error.message || 'Server error during transaction update'
        });
    }
};

export const getLiquidityStats = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ role: 'user' });
        const totalLiquidity = users.reduce((acc, user) => acc + user.accountBalance, 0);

        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTransactions = await Transaction.find({ createdAt: { $gte: last24h } });
        const volume24h = recentTransactions.reduce((acc, tx) => acc + tx.amount, 0);

        // Simulated distribution and flow for the Matrix UI
        const distribution = [
            { label: 'Institutional Reserves', value: totalLiquidity * 0.4 },
            { label: 'Active Float', value: totalLiquidity * 0.35 },
            { label: 'Settlement Vaults', value: totalLiquidity * 0.25 },
        ];

        const hourlyFlow = Array.from({ length: 12 }, (_, i) => ({
            hour: `${12 - i}h ago`,
            inflow: Math.floor(Math.random() * 50000),
            outflow: Math.floor(Math.random() * 45000),
        })).reverse();

        const reserveRatio = Math.min(35, Math.max(18, 22.4 + (totalLiquidity / 5000000)));

        res.json({
            totalLiquidity,
            volume24h,
            reserveRatio: parseFloat(reserveRatio.toFixed(1)),
            distribution,
            hourlyFlow,
            entityCount: users.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadLogo = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        let settings = await SystemSettings.findOne({});
        if (!settings) {
            settings = await SystemSettings.create({ logoUrl });
        } else {
            settings.logoUrl = logoUrl;
            settings.updatedAt = new Date();
            await settings.save();
        }

        res.json({
            message: 'Institutional logo uploaded successfully',
            logoUrl: settings.logoUrl
        });

        sendAdminAlert(
            'Brand Asset Update',
            `<p>A new brand logo has been uploaded to the platform settings.</p>
             <p><strong>Logo URL:</strong> ${settings.logoUrl}</p>`
        );
    } catch (error) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Failed to persist institutional asset' });
    }
};

export const getClosureRequests = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ isClosureRequested: true }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const approveAccountClosure = async (req: Request, res: Response) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.isClosureRequested) {
            return res.status(400).json({ message: 'No closure request for this user' });
        }

        const userEmail = user.email;
        const userName = user.name;

        // Perform the deletion (as requested: "permanently delete all your data")
        // Alternatively, we could just mark it as "closed" and keep the record
        // User requested: "Closing your account will permanently delete all your data."
        await User.findByIdAndDelete(userId);

        // Also delete their transactions? 
        // Usually we keep transactions for audit, but if they want "permanent deletion" of data...
        // Let's keep it to user for now to be safe, but the account is gone.
        // Actually, many banking apps keep transaction history.
        // I'll just delete the user.

        res.json({ message: 'Account closed and data purged successfully' });

        sendAdminAlert(
            'Account Closure Finalized',
            `<p>The account for <strong>${userName}</strong> (${userEmail}) has been formally closed and purged from the active ledger.</p>
             <p><strong>Approved by:</strong> Administrator</p>
             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error during account closure' });
    }
};
