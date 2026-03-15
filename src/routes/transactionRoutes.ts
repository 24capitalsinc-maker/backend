import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { makeTransfer, getMyTransactions } from '../controllers/transactionController';

const router = express.Router();

router.post('/transfer', protect, makeTransfer);
router.get('/my', protect, getMyTransactions);

export default router;
