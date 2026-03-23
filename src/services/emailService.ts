import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

// Create a transporter using SMTP settings (Namecheap cPanel)
const transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT, // 465 for SSL, 587 for TLS
    secure: ENV.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
    },
    tls: {
        // Do not fail on invalid certs (common for cPanel shared hosting)
        rejectUnauthorized: false
    }
});

const getBaseTemplate = (title: string, content: string, footerPrefix: string = "Optima Nexgen Secure") => `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; color: #333333; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="padding: 30px 40px; background-color: #050505; border-bottom: 2px solid #D4AF37;">
                <p style="color: #D4AF37; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 700; margin: 0 0 10px 0;">${footerPrefix}</p>
                <h1 style="font-size: 24px; font-weight: 300; margin: 0; color: #ffffff; letter-spacing: -0.01em;">${title}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px; text-align: left; line-height: 1.6; color: #444444; font-size: 15px;">
                ${content}
            </div>
            
            <!-- Footer -->
            <div style="padding: 30px 40px; border-top: 1px solid #eeeeee; background-color: #fafafa;">
                <p style="color: #999999; font-size: 11px; margin: 0; line-height: 1.5;">
                    This is an automated message from Optima Nexgen. Please do not reply directly to this email.<br>
                    © 2026 Optima Nexgen Institutional Banking. All rights reserved.
                </p>
            </div>
        </div>
    </div>
`;

export const sendWelcomeEmail = async (email: string, name: string) => {
    try {
        const title = 'Account Opening.';
        const html = getBaseTemplate(
            title,
            `<p style="margin-top: 0;">Welcome, <strong>${name}</strong>.</p>
             <p>Your institutional account has been successfully established with Optima Nexgen. You now have access to our secure digital banking platform and portfolio management services.</p>
             <p>Our team is committed to providing you with the highest standard of service and security.</p>
             <div style="margin-top: 30px; padding: 20px; border-left: 2px solid #D4AF37; background: #fafafa;">
                <p style="margin: 0; font-size: 13px; color: #b08d18;"><strong>Account Verified</strong><br>Your profile is now live and ready for use.</p>
             </div>`
        );

        const text = `Welcome to Optima Nexgen, ${name}.\n\nYour institutional account has been successfully established. You now have access to our secure digital banking platform.\n\nAccount Status: Verified and Live.`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen" <${ENV.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to Optima Nexgen: Your Account is Ready',
            html,
            text,
        });
        console.log(`✅ Welcome email sent to ${email}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending welcome email to ${email}:`, error);
    }
};

export const sendVerificationEmail = async (email: string, name: string, code: string) => {
    try {
        const title = 'Verify Your Identity.';
        const html = getBaseTemplate(
            title,
            `<p style="margin-top: 0;">Hello ${name},</p>
             <p>To finalize your account setup and ensure secure access, please use the following verification code:</p>
             <div style="background: #f5f5f5; border: 1px solid #dddddd; padding: 30px; text-align: center; margin: 30px 0; border-radius: 4px;">
                <p style="color: #666666; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px 0;">One-Time Verification Code</p>
                <p style="color: #b08d18; font-size: 36px; font-weight: bold; letter-spacing: 0.2em; margin: 0; font-family: sans-serif;">${code}</p>
                <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">Expires in 15 minutes</p>
             </div>
             <p style="font-size: 13px; color: #777777;">If you did not request this code, please contact our support team immediately.</p>`
        );

        const text = `Hello ${name},\n\nYour verification code for Optima Nexgen is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, please contact support.`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen Security" <${ENV.SMTP_USER}>`,
            to: email,
            subject: 'Your Optima Nexgen Verification Code',
            html,
            text,
        });
        console.log(`✅ Verification email sent to ${email}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending verification email to ${email}:`, error);
    }
};

export const sendTransactionNotification = async (email: string, amount: number, type: 'debit' | 'credit', referenceId: string) => {
    try {
        const subject = type === 'debit' ? 'Ledger Alert: Outbound Flow' : 'Ledger Alert: Inbound Capital';
        const description = type === 'debit'
            ? `An outbound settlement of <strong>$${amount.toLocaleString()}</strong> has been finalized.`
            : `An inbound capital injection of <strong>$${amount.toLocaleString()}</strong> has been recognized.`;

        const html = getBaseTemplate(
            'Transaction Notification.',
            `<p style="margin-top: 0;">${description}</p>
             <div style="margin: 30px 0; border-top: 1px solid #eeeeee; padding-top: 30px;">
                <table style="width: 100%; font-size: 14px; color: #444444;">
                    <tr>
                        <td style="color: #999999; padding-bottom: 10px;">Reference ID</td>
                        <td style="text-align: right; padding-bottom: 10px; font-family: monospace;">${referenceId}</td>
                    </tr>
                    <tr>
                        <td style="color: #999999; padding-bottom: 10px;">Status</td>
                        <td style="color: #2e7d32; text-align: right; padding-bottom: 10px; font-weight: bold;">SETTLED</td>
                    </tr>
                </table>
             </div>
             <p style="font-size: 13px; color: #777777; margin-top: 30px;">Log in to your dashboard to view the full details of this transaction.</p>`
        );

        const text = `Optima Nexgen Transaction Alert: ${type === 'debit' ? 'Outbound' : 'Inbound'} flow of $${amount.toLocaleString()} has been settled. Reference: ${referenceId}`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen Notifications" <${ENV.SMTP_USER}>`,
            to: email,
            subject,
            html,
            text,
        });
        console.log(`✅ Transaction notification sent to ${email}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending transaction notification to ${email}:`, error);
    }
};

export const sendTransferStatusUpdate = async (email: string, amount: number, status: string, referenceId: string, reason?: string) => {
    try {
        const isFailed = status === 'failed' || status === 'revoked';
        const title = isFailed ? 'Transfer Suspended.' : 'Transfer Approved.';
        const statusColor = isFailed ? '#ff4d4d' : '#00ff88';

        const content = `
            <p style="margin-top: 0;">The transfer of <strong>$${amount.toLocaleString()}</strong> has been updated.</p>
            <div style="background: rgba(212,175,55,0.02); border: 1px solid rgba(212,175,55,0.1); padding: 30px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 0.2em;">Transaction Status</p>
                <p style="margin: 0; font-size: 24px; color: ${statusColor}; font-weight: bold; letter-spacing: 0.1em;">${status.toUpperCase()}</p>
                ${reason ? `<p style="margin: 20px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.6);"><strong>Protocol Note:</strong> ${reason}</p>` : ''}
                ${isFailed ? `<p style="margin: 20px 0 0 0; font-size: 13px; color: #ff4d4d;">Please contact your institutional support desk immediately to resolve this discrepancy.</p>` : ''}
            </div>
            <p style="font-size: 12px; color: rgba(255,255,255,0.3);">Reference ID: <span style="font-family: monospace; color: #ffffff;">${referenceId}</span></p>
        `;

        const html = getBaseTemplate(title, content, 'Account Review');

        const text = `Optima Nexgen Account Update: The transfer of $${amount.toLocaleString()} is now ${status.toUpperCase()}. Reference: ${referenceId}`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen Review" <${ENV.SMTP_USER}>`,
            to: email,
            subject: `Account Update: ${title}`,
            html,
            text,
        });
        console.log(`✅ Status update email sent to ${email}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending transfer status update to ${email}:`, error);
    }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    try {
        const resetURL = `${ENV.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        const title = 'Reset Your Password.';
        const html = getBaseTemplate(
            title,
            `<p style="margin-top: 0;">We received a request to reset the password for your Optima Nexgen account.</p>
             <p>To proceed with setting a new password, please click the secure link below:</p>
             <div style="text-align: center; margin: 40px 0;">
                <a href="${resetURL}" style="background-color: #D4AF37; color: #ffffff; padding: 15px 35px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 4px; display: inline-block;">Reset Password</a>
             </div>
             <p style="font-size: 13px; color: #777777;">This link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>`
        );

        const text = `Hello,\n\nWe received a request to reset your Optima Nexgen password. Please use the following link to proceed: ${resetURL}\n\nThis link expires in 15 minutes.`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen Security" <${ENV.SMTP_USER}>`,
            to: email,
            subject: 'Reset Your Optima Nexgen Password',
            html,
            text,
        });
        console.log(`✅ Password reset email sent to ${email}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending reset password email to ${email}:`, error);
    }
};

export const sendAdminAlert = async (subject: string, content: string) => {
    try {
        const html = getBaseTemplate(
            'System Alert.',
            content,
            'Operations'
        );

        const text = `Optima Nexgen Admin Alert: ${subject}\n\n${content}`;

        const info = await transporter.sendMail({
            from: `"Optima Nexgen Ops" <${ENV.SMTP_USER}>`,
            to: ENV.ADMIN_EMAIL,
            subject: `[ADMIN] ${subject}`,
            html,
            text,
        });
        console.log(`✅ Admin alert sent to ${ENV.ADMIN_EMAIL}. MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending admin alert to ${ENV.ADMIN_EMAIL}:`, error);
    }
};

export const sendSecurityAlert = async (email: string, action: string) => {
    try {
        const html = getBaseTemplate(
            'Security Notification.',
            `<p style="margin-top: 0;">An update has been made to your account security settings.</p>
             <div style="background: #fff5f5; border-left: 4px solid #d32f2f; padding: 25px; margin: 30px 0;">
                <p style="margin: 0; color: #d32f2f; font-weight: bold; font-size: 14px;">Security Update</p>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #444444;"><strong>Action:</strong> ${action}</p>
             </div>
             <p style="font-size: 13px; color: #777777;">If you did not authorize this change, please contact our support team immediately.</p>`
        );

        const text = `Optima Nexgen Security Alert: A change was made to your account (${action}). If this wasn't you, please contact support.`;

        await transporter.sendMail({
            from: `"Optima Nexgen Security" <${ENV.SMTP_USER}>`,
            to: email,
            subject: 'Security Notification: Account Updated',
            html,
            text,
        });
    } catch (error) {
        console.error('Error sending security alert email:', error);
    }
};
