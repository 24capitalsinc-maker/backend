import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Configure process-level DNS to use Google DNS for reliable SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

export const connectDB = async () => {
    try {
        await mongoose.connect(ENV.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};
