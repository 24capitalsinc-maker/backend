import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Configure process-level DNS to use Google DNS for reliable SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Cached connection for serverless environments.
 * Prevents multiple connections during a single instance lifecycle.
 */
let cachedConnection: any = null;

export const connectDB = async () => {
    // If a connection already exists, return it immediately
    if (cachedConnection) {
        if (mongoose.connection.readyState === 1) {
            return cachedConnection;
        }
        // If connection exists but is not open, clear it to retry
        cachedConnection = null;
    }

    try {
        const conn = await mongoose.connect(ENV.MONGO_URI, {
            // Buffer commands to handle transient connection drops gracefully
            bufferCommands: true,
        });

        cachedConnection = conn;
        console.log('MongoDB connected successfully');
        return conn;
    } catch (error) {
        console.error('MongoDB connection failed:', error);

        // In serverless/Vercel (production), throwing is safer than process.exit(1) 
        // as it allows the platform to handle the failure and retry.
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
        throw error;
    }
};
