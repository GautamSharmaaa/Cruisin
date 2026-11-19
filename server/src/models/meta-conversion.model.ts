// Governed by .rules v1.0
import { model, Schema } from 'mongoose';
import type { MetaBrowserEventName } from '@cruisin/contracts/meta-commerce';

export interface MetaCustomerSignals {
  client_user_agent: string;
  client_ip_address?: string;
  fbp?: string;
  fbc?: string;
  em?: string[];
  ph?: string[];
}

export interface MetaGraphEvent {
  event_name: MetaBrowserEventName | 'Purchase';
  event_id: string;
  event_time: number;
  event_source_url: string;
  action_source: 'website';
  user_data: MetaCustomerSignals;
  custom_data?: Record<string, unknown>;
}

const consentSchema = new Schema({
  _id: { type: String, required: true },
  pixelId: { type: String, required: true },
  version: { type: Number, required: true },
  revokedAt: { type: Date },
  grantedAt: { type: Date },
  source: { type: String, enum: ['default', 'shopper'] },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { versionKey: false });

const conversionSchema = new Schema({
  _id: { type: String, required: true },
  pixelId: { type: String, required: true },
  consentRef: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId },
  event: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['queued', 'sent', 'discarded', 'failed'], required: true, default: 'queued' },
  attempts: { type: Number, required: true, default: 0 },
  nextAttemptAt: { type: Date, required: true },
  claimId: { type: String },
  finishedAt: { type: Date },
  outcome: { type: String },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true, versionKey: false });

conversionSchema.index({ pixelId: 1, status: 1, nextAttemptAt: 1 });

export const MetaConsentModel = model('MetaConsent', consentSchema);
export const MetaConversionModel = model('MetaConversion', conversionSchema);
