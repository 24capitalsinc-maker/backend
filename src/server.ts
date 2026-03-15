import app from './app';
import { ENV } from './config/env';
import { connectDB } from './config/database';

const startServer = async () => {
    await connectDB();

    app.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT}`);
    });
};

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    startServer().catch(err => {
        console.error('Failed to start server:', err);
    });
}
