import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, updateProfile } from '../controllers/userController';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateProfile);

export default router;
