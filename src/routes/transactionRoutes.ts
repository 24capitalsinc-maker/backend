import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { makeTransfer, getMyTransactions, getReceiptByRef } from '../controllers/transactionController';

const router = express.Router();

router.post('/transfer', protect, makeTransfer);
router.get('/my', protect, getMyTransactions);
router.get('/receipt/:referenceId', getReceiptByRef); // Public — no auth

export default router;
