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

export const sendVerificationEmail = async (email: string, name: string, code: string) => {
    try {
        await resend.emails.send({
            from: 'Capital24 <onboarding@resend.dev>',
            to: email,
            subject: 'Verify Your Capital24 Account',
            html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 48px 32px; max-width: 480px; margin: 0 auto;">
              <div style="border-top: 2px solid #D4AF37; padding-top: 32px; margin-bottom: 32px;">
                <p style="color: #D4AF37; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: bold;">Capital24 Secure</p>
                <h1 style="font-size: 28px; font-weight: 300; margin: 12px 0 0 0; color: #ffffff;">Verify Your Identity.</h1>
              </div>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.7; margin-bottom: 32px;">
                Hello ${name},<br><br>
                Your Capital24 institutional account is almost ready. Please use the 6-digit verification code below to complete your registration:
              </p>
              <div style="background: #111111; border: 1px solid rgba(212,175,55,0.3); padding: 32px; text-align: center; margin-bottom: 32px;">
                <p style="color: rgba(255,255,255,0.3); font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; margin: 0 0 12px 0;">Verification Code</p>
                <p style="color: #D4AF37; font-size: 40px; font-weight: bold; letter-spacing: 0.4em; margin: 0; font-family: monospace;">${code}</p>
                <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 12px 0 0 0;">Expires in 15 minutes</p>
              </div>
              <p style="color: rgba(255,255,255,0.3); font-size: 12px; line-height: 1.6;">
                If you did not create a Capital24 account, please ignore this email. Do not share this code with anyone.
              </p>
            </div>`,
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
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
