import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import {
    getAllUsers,
    getAllTransactions,
    updateAccountStatus,
    updateUserLimits,
    updateUserBalance,
    getAdminMetrics,
    getSystemSettings,
    updateSystemSettings,
    updateTransaction,
    getLiquidityStats,
    uploadLogo
} from '../controllers/adminController';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Metadata Storage Protocol
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only institutional images are authorized (JPEG/PNG/GIF/SVG/ICO)'));
    }
});

router.use(protect);
router.use(admin);

router.get('/users', getAllUsers);
router.get('/transactions', getAllTransactions);
router.put('/transactions/:id', updateTransaction);
router.patch('/user-status', updateAccountStatus);
router.patch('/user-limits', updateUserLimits);
router.patch('/user-balance', updateUserBalance);
router.get('/metrics', getAdminMetrics);
router.get('/liquidity', getLiquidityStats);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/upload-logo', upload.single('logo'), uploadLogo);

export default router;
