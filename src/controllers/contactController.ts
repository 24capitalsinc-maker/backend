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
            `<p>A new institutional inquiry has been received from <strong>${name}</strong> (${email}).</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong></p>
             <div style="background: #f4f4f4; padding: 20px; border-left: 4px solid #D4AF37;">
                ${message}
             </div>
             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`
        );

    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ message: 'Institutional failure during message transmission.' });
    }
};
