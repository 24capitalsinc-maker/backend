import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import User from '../models/User';

export const protect = async (req: any, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];


            const decoded: any = jwt.verify(token, ENV.JWT_SECRET);


            const user = await User.findById(decoded.id).select('-password');
            if (!user) {

                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = user;
            return next();
        } catch (error: any) {

            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {

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
