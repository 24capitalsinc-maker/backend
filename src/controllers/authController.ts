import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { ENV } from '../config/env';
import { generateAccountNumber } from '../utils/generateAccountNumber';
import { sendWelcomeEmail, sendAdminAlert } from '../services/emailService';
import SystemSettings from '../models/SystemSettings';

const generateTokens = (id: string) => {
    const accessToken = jwt.sign({ id }, ENV.JWT_SECRET as string, { expiresIn: ENV.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ id }, ENV.REFRESH_TOKEN_SECRET as string, { expiresIn: ENV.REFRESH_TOKEN_EXPIRES_IN as any });
    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
    const { name, email, password, phoneNumber, dateOfBirth, address, gender, occupation } = req.body;

    try {
        const settings = await SystemSettings.findOne({});
        if (settings && !settings.isRegistrationEnabled) {
            return res.status(403).json({ message: 'Institutional recruitment is currently suspended.' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Ensure unique account number
        let accountNumber = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            accountNumber = generateAccountNumber();
            const existingAccount = await User.findOne({ accountNumber });
            if (!existingAccount) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Failed to generate a unique account number. Please try again.');
        }

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            dateOfBirth,
            address,
            gender,
            occupation,
            accountNumber,
        });

        await sendWelcomeEmail(user.email, user.name);
        await sendAdminAlert(
            'New Portfolio Initialized',
            `<p>A new institutional portfolio has been opened.</p>
             <p><strong>Name:</strong> ${user.name}</p>
             <p><strong>Email:</strong> ${user.email}</p>
             <p><strong>Account Number:</strong> ${user.accountNumber}</p>`
        );

        const { accessToken, refreshToken } = generateTokens((user._id as any).toString());
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            accountNumber: user.accountNumber,
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        const settings = await SystemSettings.findOne({});

        if (user && (await bcrypt.compare(password, user.password))) {
            if (settings?.isMaintenanceMode && user.role !== 'admin') {
                return res.status(503).json({
                    message: settings.maintenanceMessage || 'System upgrade in progress. Sovereign services will resume shortly.'
                });
            }

            const { accessToken, refreshToken } = generateTokens((user._id as any).toString());
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                accountNumber: user.accountNumber,
                role: user.role,
                accessToken,
                refreshToken,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
import crypto from 'crypto';

// ... other imports ...

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Return success even if user not found for security (mitigate email enumeration)
            return res.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await user.save();

        // Pass the raw token to the email service
        await require('../services/emailService').sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error: any) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const tokenString = Array.isArray(token) ? token[0] : token;
        const hashedToken = crypto.createHash('sha256').update(tokenString).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired recovery token.' });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Success! Your institutional credentials have been updated.' });
    } catch (error: any) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
