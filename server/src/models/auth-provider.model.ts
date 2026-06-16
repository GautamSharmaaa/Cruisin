// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

export const authProviderNames = ['email', 'google', 'whatsapp'] as const;

const authProviderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: authProviderNames, required: true, index: true },
    providerUserId: { type: String, trim: true },
    providerEmail: { type: String, lowercase: true, trim: true },
    providerPhone: { type: String, trim: true },
    isVerified: { type: Boolean, default: true, index: true },
    linkedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

authProviderSchema.index(
  { provider: 1, providerUserId: 1 },
  { unique: true, partialFilterExpression: { providerUserId: { $type: 'string' } } }
);
authProviderSchema.index(
  { provider: 1, providerEmail: 1 },
  { unique: true, partialFilterExpression: { providerEmail: { $type: 'string' } } }
);
authProviderSchema.index(
  { provider: 1, providerPhone: 1 },
  { unique: true, partialFilterExpression: { providerPhone: { $type: 'string' } } }
);
authProviderSchema.index({ user: 1, provider: 1 }, { unique: true });

export type AuthProviderDocument = InferSchemaType<typeof authProviderSchema>;
export const AuthProviderModel = model('AuthProvider', authProviderSchema);
