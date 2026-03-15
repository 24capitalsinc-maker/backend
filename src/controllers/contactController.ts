import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage';
import { sendAdminAlert } from '../services/emailService';

export const submitContactForm = async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'All protocol fields are required for submission.' });
        }

        const newMessage = await ContactMessage.create({
            name,
            email,
            subject,
            message
        });

        res.status(201).json({
            message: 'Message successfully transmitted to the institutional vault.',
            id: newMessage._id
        });

        // Notify Admin of new institutional inquiry
        sendAdminAlert(
            `New Secure Inquiry: ${subject}`,
            `<p style="margin-top: 0;">A new institutional inquiry has been received from <strong>${name}</strong> (${email}).</p>
             <div style="margin: 20px 0; padding: 20px; border: 1px solid rgba(212,175,55,0.1); background: rgba(212,175,55,0.02);">
                <p style="margin: 0; font-size: 13px;"><strong>Subject:</strong> ${subject}</p>
                <div style="margin-top: 20px; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6;">
                    ${message}
                </div>
                <p style="margin: 20px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.4);">Timestamp: ${new Date().toISOString()}</p>
             </div>`
        );

    } catch (error) {
        // Handled via centralized error middleware
        res.status(500).json({ message: 'Institutional failure during message transmission.' });
    }
};
