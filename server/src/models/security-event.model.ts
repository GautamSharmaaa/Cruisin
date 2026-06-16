// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const securityEventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true, index: true },
    ipAddress: { type: String, trim: true },
    location: { type: String, trim: true },
    deviceName: { type: String, trim: true },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    metadata: { type: Map, of: String, default: {} }
  },
  { timestamps: true }
);

securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });

export type SecurityEventDocument = InferSchemaType<typeof securityEventSchema>;
export const SecurityEventModel = model('SecurityEvent', securityEventSchema);
