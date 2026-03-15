import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import { ENV } from '../config/env';
import { generateAccountNumber } from '../utils/generateAccountNumber';
import { sendVerificationEmail, sendAdminAlert } from '../services/emailService';
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

        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

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
            isEmailVerified: false,
            verificationCode,
            verificationCodeExpires,
        });

        // Send the verification code email
        await sendVerificationEmail(user.email, user.name, verificationCode);
        await sendAdminAlert(
            'New Portfolio Initialized',
            `<p style="margin-top: 0;">A new institutional portfolio has been opened and is awaiting verification.</p>
             <div style="margin: 20px 0; padding: 20px; border: 1px solid rgba(212,175,55,0.1); background: rgba(212,175,55,0.02);">
                <p style="margin: 0; font-size: 13px;"><strong>Identity:</strong> ${user.name}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Account:</strong> ${user.accountNumber}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Status:</strong> PENDING VERIFICATION</p>
             </div>`
        );

        // Return userId only — tokens are issued after email verification
        res.status(201).json({
            userId: (user._id as any).toString(),
            message: 'Registration successful. Please check your email for the verification code.',
        });
    } catch (error: any) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    const { userId, code } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'This account is already verified.' });
        }
        if (!user.verificationCode || !user.verificationCodeExpires) {
            return res.status(400).json({ message: 'No verification code found. Please re-register.' });
        }
        if (new Date() > user.verificationCodeExpires) {
            return res.status(400).json({ message: 'Verification code has expired. Please contact support.' });
        }
        if (user.verificationCode !== code.trim()) {
            return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
        }

        // Mark as verified and clear the code using an atomic update
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: { isEmailVerified: true },
                $unset: { verificationCode: 1, verificationCodeExpires: 1 }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User record lost during verification.' });
        }

        // Now issue the full auth tokens
        const { accessToken, refreshToken } = generateTokens((updatedUser._id as any).toString());
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            accountNumber: updatedUser.accountNumber,
            role: updatedUser.role,
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        const settings = await SystemSettings.findOne({});

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isEmailVerified) {
                return res.status(403).json({
                    message: 'Verification pending. Please verify your email to access your institutional portfolio.',
                    userId: user._id,
                    isUnverified: true
                });
            }

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

            // Notify admin of successful login
            sendAdminAlert(
                'User Session Initialized',
                `<p style="margin-top: 0;">Institutional access has been granted to a verified account.</p>
                 <div style="margin: 20px 0; padding: 20px; border: 1px solid rgba(212,175,55,0.1); background: rgba(212,175,55,0.02);">
                    <p style="margin: 0; font-size: 13px;"><strong>Identity:</strong> ${user.name}</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                 </div>`
            );
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

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
        // Handled via centralized error middleware
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
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Server error' });
    }
};
export const resendVerificationCode = async (req: Request, res: Response) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'This account is already verified.' });
        }

        // Generate a new 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Update user with new code using an atomic update
        await User.findByIdAndUpdate(userId, {
            $set: {
                verificationCode: verificationCode,
                verificationCodeExpires: verificationCodeExpires
            }
        });

        // Send the new verification code email
        await sendVerificationEmail(user.email, user.name, verificationCode);

        res.json({ message: 'A new verification code has been sent to your email.' });
    } catch (error: any) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
