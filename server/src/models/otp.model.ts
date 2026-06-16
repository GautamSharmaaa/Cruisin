// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

export const otpChannels = ['whatsapp'] as const;
export const otpPurposes = ['login', 'link_account', 'verify_phone', 'reset_password'] as const;

const otpSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    phone: { type: String, required: true, trim: true, index: true },
    channel: { type: String, enum: otpChannels, required: true, index: true },
    otpHash: { type: String, required: true, select: false },
    purpose: { type: String, enum: otpPurposes, required: true, index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date },
    ipAddress: { type: String, trim: true },
    deviceFingerprint: { type: String, trim: true }
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
otpSchema.index({ ipAddress: 1, createdAt: -1 });

export type OtpDocument = InferSchemaType<typeof otpSchema>;
export const OtpModel = model('Otp', otpSchema);
