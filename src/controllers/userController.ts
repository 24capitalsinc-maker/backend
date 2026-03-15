import { Request, Response } from 'express';
import User from '../models/User';
import { sendSecurityAlert } from '../services/emailService';

export const getUserProfile = async (req: any, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    const {
        name, phoneNumber, address, occupation,
        twoFactorEnabled, notifications, preferences, limits
    } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
        if (address !== undefined) user.address = address;
        if (occupation !== undefined) user.occupation = occupation;
        if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
        if (notifications) user.notifications = { ...user.notifications, ...notifications };
        if (preferences) user.preferences = { ...user.preferences, ...preferences };
        if (limits) user.limits = { ...user.limits, ...limits };

        const updatedUser = await user.save();

        // Send security alert for sensitive changes
        if (twoFactorEnabled !== undefined || notifications || limits) {
            sendSecurityAlert(user.email, 'Security preferences or limits updated');
        }

        // Remove sensitive fields
        const userObj = updatedUser.toObject() as any;
        const { password, ...response } = userObj;

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
