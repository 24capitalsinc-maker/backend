import { Resend } from 'resend';
import { ENV } from '../config/env';

const resend = new Resend(ENV.RESEND_API_KEY);

export const sendWelcomeEmail = async (email: string, name: string) => {
    try {
        await resend.emails.send({
            from: 'Capital24 <onboarding@resend.dev>',
            to: email,
            subject: 'Welcome to Capital24!',
            html: `<h1>Welcome, ${name}!</h1><p>Thank you for choosing Capital24 for your digital banking needs. Your account has been successfully created.</p>`,
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

export const sendTransactionNotification = async (email: string, amount: number, type: 'debit' | 'credit', referenceId: string) => {
    try {
        const subject = type === 'debit' ? 'Transaction Alert: Debit' : 'Transaction Alert: Credit';
        const message = type === 'debit'
            ? `A debit transaction of $${amount.toLocaleString()} has been processed on your account.`
            : `A credit transaction of $${amount.toLocaleString()} has been received in your account.`;

        await resend.emails.send({
            from: 'Capital24 Alerts <alerts@resend.dev>',
            to: email,
            subject,
            html: `<h2>Transaction Notification</h2>
             <p>${message}</p>
             <p><strong>Reference ID:</strong> ${referenceId}</p>
             <p>Thank you for banking with us.</p>`,
        });
    } catch (error) {
        console.error('Error sending transaction notification email:', error);
    }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    try {
        const resetURL = `${ENV.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        await resend.emails.send({
            from: 'Capital24 Security <security@resend.dev>',
            to: email,
            subject: 'Secure Password Reset Request',
            html: `<h2>Password Recovery Initialized</h2>
             <p>A password reset has been requested for your Capital24 account.</p>
             <p>Please click the button below to establish a new secure access credential. This link will expire in 15 minutes.</p>
             <a href="${resetURL}" style="background-color: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
             <p>If you did not request this, please disregard this email or contact support.</p>`,
        });
    } catch (error) {
        console.error('Error sending reset password email:', error);
    }
};
export const sendAdminAlert = async (subject: string, html: string) => {
    try {
        await resend.emails.send({
            from: 'Capital24 Ops <ops@resend.dev>',
            to: ENV.ADMIN_EMAIL,
            subject: `[ADMIN ALERT] ${subject}`,
            html: `<h1>Administrative Alert</h1>${html}`,
        });
    } catch (error) {
        console.error('Error sending admin alert email:', error);
    }
};

export const sendSecurityAlert = async (email: string, action: string) => {
    try {
        await resend.emails.send({
            from: 'Capital24 Security <security@resend.dev>',
            to: email,
            subject: 'Security Alert: Profile Update',
            html: `<h2>Security Notification</h2>
             <p>This is to inform you that your account profile was recently updated: <strong>${action}</strong>.</p>
             <p>If you did not authorize this change, please contact our support team immediately.</p>`,
        });
    } catch (error) {
        console.error('Error sending security alert email:', error);
    }
};
