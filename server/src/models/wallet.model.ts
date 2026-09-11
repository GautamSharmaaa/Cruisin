// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const walletEntrySchema = new Schema({
  operationId: { type: String, required: true, trim: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  sourceType: { type: String, enum: ['return_refund', 'membership_credit', 'order_payment', 'admin_adjustment'], required: true },
  sourceReference: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, required: true, default: Date.now }
}, { _id: true });

const walletSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currency: { type: String, enum: ['INR'], required: true, default: 'INR' },
  status: { type: String, enum: ['active', 'locked'], required: true, default: 'active', index: true },
  availableBalancePaise: { type: Number, required: true, min: 0, default: 0 },
  totalCreditedPaise: { type: Number, required: true, min: 0, default: 0 },
  totalDebitedPaise: { type: Number, required: true, min: 0, default: 0 },
  entries: { type: [walletEntrySchema], default: [] }
}, { timestamps: true });

walletSchema.index({ customer: 1, 'entries.createdAt': -1 });
walletSchema.index({ customer: 1, 'entries.operationId': 1 });

export type WalletDocument = InferSchemaType<typeof walletSchema>;
export const WalletModel = model('Wallet', walletSchema);
