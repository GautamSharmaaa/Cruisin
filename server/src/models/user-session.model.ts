// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const userSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionFamilyId: { type: String, required: true, index: true },
    deviceName: { type: String, trim: true, default: 'Unknown device' },
    browser: { type: String, trim: true },
    os: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    location: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    lastActive: { type: Date, default: Date.now, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, select: false },
    revokedAt: { type: Date },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

export type UserSessionDocument = InferSchemaType<typeof userSessionSchema>;
export const UserSessionModel = model('UserSession', userSessionSchema);
