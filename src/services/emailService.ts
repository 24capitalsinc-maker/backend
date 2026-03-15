import { Resend } from 'resend';
import { ENV } from '../config/env';

const resend = new Resend(ENV.RESEND_API_KEY);

const getBaseTemplate = (title: string, content: string, footerPrefix: string = "Capital24 Secure") => `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #050505; color: #ffffff; padding: 60px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid rgba(212,175,55,0.15); box-shadow: 0 40px 100px rgba(0,0,0,0.8);">
            <!-- Header -->
            <div style="padding: 40px; border-bottom: 1px solid rgba(212,175,55,0.1);">
                <p style="color: #D4AF37; font-size: 10px; letter-spacing: 0.5em; text-transform: uppercase; font-weight: 800; margin: 0 0 15px 0;">${footerPrefix}</p>
                <h1 style="font-size: 32px; font-weight: 200; margin: 0; color: #ffffff; letter-spacing: -0.02em;">${title}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 50px 40px; text-align: left; line-height: 1.8; color: rgba(255,255,255,0.7); font-size: 15px;">
                ${content}
            </div>
            
            <!-- Footer -->
            <div style="padding: 30px 40px; border-top: 1px solid rgba(212,175,55,0.05); background-color: rgba(212,175,55,0.02);">
                <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0; letter-spacing: 0.1em;">
                    This communication is intended solely for institutional partners of Capital24. <br>
                    © 2026 Capital24 Institutional Wealth. All global meridians reserved.
                </p>
            </div>
        </div>
    </div>
`;

export const sendWelcomeEmail = async (email: string, name: string) => {
    try {
        const html = getBaseTemplate(
            'Institutional Onboarding.',
            `<p style="margin-top: 0;">Welcome, <strong>${name}</strong>.</p>
             <p>Your institutional portfolio has been successfully established within the Capital24 sovereign vault. You now have access to global liquidity and private wealth management protocols.</p>
             <p>Our commitment to your capital preservation and growth is absolute.</p>
             <div style="margin-top: 40px; padding: 20px; border-left: 2px solid #D4AF37; background: rgba(212,175,55,0.05);">
                <p style="margin: 0; font-size: 13px; color: #D4AF37;"><strong>Protocol Alpha-7 Active</strong><br>Account status: Live & Verified</p>
             </div>`
        );

        await resend.emails.send({
            from: 'Capital24 <wealth@resend.dev>',
            to: email,
            subject: 'Institutional Onboarding: Welcome to Capital24',
            html,
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

export const sendVerificationEmail = async (email: string, name: string, code: string) => {
    try {
        const html = getBaseTemplate(
            'Verify Your Identity.',
            `<p style="margin-top: 0;">Hello ${name},</p>
             <p>To finalize the synchronization of your private wealth portfolio, please authenticate using the following high-security verification code:</p>
             <div style="background: #111111; border: 1px solid rgba(212,175,55,0.3); padding: 40px; text-align: center; margin: 40px 0;">
                <p style="color: rgba(255,255,255,0.3); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; margin: 0 0 15px 0;">Encryption Key</p>
                <p style="color: #D4AF37; font-size: 48px; font-weight: bold; letter-spacing: 0.5em; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
                <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 15px 0 0 0;">Expires in 15 minutes // Single Use Only</p>
             </div>
             <p style="font-size: 12px; color: rgba(255,255,255,0.4);">If you did not initiate this request, please mobilize security protocols immediately by contacting your advisor.</p>`
        );

        await resend.emails.send({
            from: 'Capital24 Security <security@resend.dev>',
            to: email,
            subject: 'Secure Authenticator: Verification Protocol',
            html,
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
    }
};

export const sendTransactionNotification = async (email: string, amount: number, type: 'debit' | 'credit', referenceId: string) => {
    try {
        const subject = type === 'debit' ? 'Ledger Alert: Outbound Flow' : 'Ledger Alert: Inbound Capital';
        const description = type === 'debit'
            ? `An outbound settlement of <strong>$${amount.toLocaleString()}</strong> has been finalized.`
            : `An inbound capital injection of <strong>$${amount.toLocaleString()}</strong> has been recognized.`;

        const html = getBaseTemplate(
            'Ledger Update.',
            `<p style="margin-top: 0;">${description}</p>
             <div style="margin: 30px 0; border-top: 1px solid rgba(212,175,55,0.1); padding-top: 30px;">
                <table style="width: 100%; font-size: 13px;">
                    <tr>
                        <td style="color: rgba(255,255,255,0.3); padding-bottom: 10px;">Reference ID</td>
                        <td style="color: #ffffff; text-align: right; padding-bottom: 10px; font-family: monospace;">${referenceId}</td>
                    </tr>
                    <tr>
                        <td style="color: rgba(255,255,255,0.3); padding-bottom: 10px;">Status</td>
                        <td style="color: #00ff88; text-align: right; padding-bottom: 10px; font-weight: bold; letter-spacing: 0.1em;">SETTLED</td>
                    </tr>
                </table>
             </div>
             <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 30px;">This transaction has been recorded on the global institutional ledger.</p>`
        );

        await resend.emails.send({
            from: 'Capital24 Ledger <ledger@resend.dev>',
            to: email,
            subject,
            html,
        });
    } catch (error) {
        console.error('Error sending transaction notification email:', error);
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

        const html = getBaseTemplate(title, content, 'Institutional Review');

        await resend.emails.send({
            from: 'Capital24 Review <review@resend.dev>',
            to: email,
            subject: `Institutional Update: ${title}`,
            html,
        });
    } catch (error) {
        console.error('Error sending transfer status update email:', error);
    }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    try {
        const resetURL = `${ENV.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        const html = getBaseTemplate(
            'Credential Recovery.',
            `<p style="margin-top: 0;">A recovery protocol has been initialized for your institutional credentials.</p>
             <p>Access to the sovereign vault is restricted until security parameters are re-established. Please use the secure link below to proceed:</p>
             <div style="text-align: center; margin: 40px 0;">
                <a href="${resetURL}" style="background-color: #D4AF37; color: #000; padding: 18px 40px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; display: inline-block; box-shadow: 0 10px 30px rgba(212,175,55,0.3);">Reset Credentials</a>
             </div>
             <p style="font-size: 12px; color: rgba(255,255,255,0.4);">This link will expire in 15 minutes. If you did not initialize this sequence, mobilize support immediately.</p>`
        );

        await resend.emails.send({
            from: 'Capital24 Security <security@resend.dev>',
            to: email,
            subject: 'Credential Recovery: Secure Link',
            html,
        });
    } catch (error) {
        console.error('Error sending reset password email:', error);
    }
};

export const sendAdminAlert = async (subject: string, content: string) => {
    try {
        const html = getBaseTemplate(
            'Institutional Alert.',
            content,
            'Sovereign Operations'
        );

        await resend.emails.send({
            from: 'Capital24 Ops <ops@resend.dev>',
            to: ENV.ADMIN_EMAIL,
            subject: `[ADMIN ALERT] ${subject}`,
            html,
        });
    } catch (error) {
        console.error('Error sending admin alert email:', error);
    }
};

export const sendSecurityAlert = async (email: string, action: string) => {
    try {
        const html = getBaseTemplate(
            'Security Breach Alert.',
            `<p style="margin-top: 0;">Unusual activity detected on your institutional profile.</p>
             <div style="background: rgba(255,77,77,0.05); border-left: 3px solid #ff4d4d; padding: 25px; margin: 30px 0;">
                <p style="margin: 0; color: #ff4d4d; font-weight: bold; font-size: 14px;">Institutional Metadata Modified</p>
                <p style="margin: 10px 0 0 0; font-size: 13px;"><strong>Trigger:</strong> ${action}</p>
             </div>
             <p>If you did not authorize this modification, please contact our counter-fraud unit immediately to protect your assets.</p>`
        );

        await resend.emails.send({
            from: 'Capital24 Security <security@resend.dev>',
            to: email,
            subject: 'Urgent: Institutional Security Notification',
            html,
        });
    } catch (error) {
        console.error('Error sending security alert email:', error);
    }
};
