import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import User from '../models/User';

export const protect = async (req: any, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('DEBUG: Auth Token Received:', token ? 'YES' : 'NO');

            const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
            console.log('DEBUG: Decoded ID:', decoded.id);

            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                console.log('DEBUG: User not found for ID:', decoded.id);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            console.log('DEBUG: User authenticated:', user.email);
            req.user = user;
            return next();
        } catch (error: any) {
            console.error('DEBUG: JWT Error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        console.log('DEBUG: No token provided in headers');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const admin = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
