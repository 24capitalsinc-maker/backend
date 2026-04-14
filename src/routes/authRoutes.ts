import express from 'express';
import { register, login, forgotPassword, resetPassword, verifyEmail, resendVerificationCode, refreshToken, logout } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
