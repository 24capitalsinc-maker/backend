import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, updateProfile, requestAccountClosure } from '../controllers/userController';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/request-closure', protect, requestAccountClosure);

export default router;
