import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testSMTP = async () => {
    console.log('--- SMTP Diagnostic Tool ---');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true, // Enable debug output
        logger: true  // Log to console
    });

    try {
        console.log('\nAttempting to verify connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection verified successfully!');

        console.log('\nAttempting to send a test email...');
        const info = await transporter.sendMail({
            from: `"SMTP Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self
            subject: 'SMTP Diagnostic Test',
            text: 'If you receive this, your SMTP configuration is working correctly.',
            html: '<b>If you receive this, your SMTP configuration is working correctly.</b>'
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error: any) {
        console.error('\n❌ SMTP Error detected:');
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Response:', error.response);
        console.error('Full Error:', error);
    }
};

testSMTP();
