import { Request, Response } from 'express';
import { transferFunds } from '../services/transactionService';
import Transaction from '../models/Transaction';

export const makeTransfer = async (req: any, res: Response) => {
    const {
        receiverAccountNumber,
        receiverName,
        amount,
        description,
        currency,
        routingProtocol,
        swiftCode,
        iban,
        jurisdiction
    } = req.body;

    try {
        const transaction = await transferFunds(
            req.user._id,
            receiverAccountNumber,
            receiverName,
            amount,
            description,
            { currency, routingProtocol, swiftCode, iban, jurisdiction }
        );
        res.status(201).json(transaction);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyTransactions = async (req: any, res: Response) => {
    try {
        const transactions = await Transaction.find({
            $or: [{ sender: req.user._id }, { receiver: req.user._id }]
        }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Public endpoint — no auth required — returns only safe receipt fields
export const getReceiptByRef = async (req: Request, res: Response) => {
    const { referenceId } = req.params;
    try {
        const transaction = await Transaction.findOne({ referenceId })
            .select('referenceId amount currency type status routingProtocol receiverAccountNumber receiverName description jurisdiction createdAt detailLabel');

        if (!transaction) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
