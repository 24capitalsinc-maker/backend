import { Request, Response } from 'express';
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
            'Manual Liquidity Adjustment',
            `<p>Institutional capital has been manually adjusted for entity <strong>${user.name}</strong> (${user.email}).</p>
             <p><strong>Previous Balance:</strong> $${oldBalance.toLocaleString()}</p>
             <p><strong>New Balance:</strong> $${user.accountBalance.toLocaleString()}</p>
             <p><strong>Principal:</strong> Administrator</p>
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
            'System Governance Update',
            `<p>Institutional parameters have been modified.</p>
             <p><strong>Configured by:</strong> Administrator</p>
             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const transaction = await Transaction.findById(id).populate('sender');
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const oldStatus = transaction.status;
        Object.assign(transaction, req.body);
        const updatedTransaction = await transaction.save();

        res.json(updatedTransaction);

        // Notify user if status changed
        if (req.body.status && req.body.status !== oldStatus) {
            const sender = transaction.sender as any;
            if (sender && sender.email) {
                sendTransferStatusUpdate(
                    sender.email,
                    transaction.amount,
                    transaction.status,
                    transaction.referenceId,
                    req.body.description || transaction.description
                );
            }
        }
    } catch (error: any) {
        // Handled via centralized error middleware
        res.status(500).json({
            message: 'Server error during transaction update'
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
            'Institutional Asset Update',
            `<p>A new institutional logo has been persisted to the sovereign vault.</p>
             <p><strong>Logo URL:</strong> ${settings.logoUrl}</p>`
        );
    } catch (error) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Failed to persist institutional asset' });
    }
};
