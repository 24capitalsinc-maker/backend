import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    sender: mongoose.Types.ObjectId;
    receiver?: mongoose.Types.ObjectId;
    receiverAccountNumber: string;
    amount: number;
    currency: string;
    routingProtocol: 'Domestic' | 'International' | 'Offshore';
    swiftCode?: string;
    iban?: string;
    jurisdiction?: string;
    type: 'debit' | 'credit';
    status: 'pending' | 'success' | 'failed';
    referenceId: string;
    description: string;
    detailLabel?: string;
    valueLabel?: string;
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    receiverAccountNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    routingProtocol: { type: String, enum: ['Domestic', 'International', 'Offshore'], default: 'Domestic' },
    swiftCode: { type: String },
    iban: { type: String },
    jurisdiction: { type: String },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    referenceId: { type: String, required: true, unique: true },
    description: { type: String },
    detailLabel: { type: String },
    valueLabel: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
