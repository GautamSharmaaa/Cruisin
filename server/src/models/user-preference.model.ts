// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const userPreferenceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    language: { type: String, default: 'en', trim: true },
    currency: { type: String, default: 'INR', trim: true },
    theme: { type: String, enum: ['dark'], default: 'dark' },
    marketingEmails: { type: Boolean, default: false },
    orderEmails: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    whatsappNotifications: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type UserPreferenceDocument = InferSchemaType<typeof userPreferenceSchema>;
export const UserPreferenceModel = model('UserPreference', userPreferenceSchema);
