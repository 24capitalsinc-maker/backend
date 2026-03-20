import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    isMaintenanceMode: boolean;
    isRegistrationEnabled: boolean;
    companyName: string;
    supportEmail: string;
    logoUrl: string;
    logoText: string;
    logoAccent: string;
    socialLinks: {
        twitter?: string;
        linkedin?: string;
        instagram?: string;
        facebook?: string;
    };
    maintenanceMessage: string;
    updatedAt: Date;
}

const SystemSettingsSchema: Schema = new Schema({
    isMaintenanceMode: { type: Boolean, default: false },
    isRegistrationEnabled: { type: Boolean, default: true },
    companyName: { type: String, default: 'optimanexgen' },
    supportEmail: { type: String, default: 'support@optimanexgen.org' },
    logoUrl: { type: String, default: '/logo.png' },
    logoText: { type: String, default: 'optima' },
    logoAccent: { type: String, default: 'nexgen' },
    socialLinks: {
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        instagram: { type: String, default: '' },
        facebook: { type: String, default: '' },
    },
    maintenanceMessage: { type: String, default: 'System upgrade in progress. Sovereign services will resume shortly.' },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
