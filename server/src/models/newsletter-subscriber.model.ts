// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const newsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    source: { type: String, trim: true, default: 'homepage' },
    consent: { type: Boolean, default: true },
    userAgent: { type: String, trim: true, default: '' },
    ipHash: { type: String, trim: true, default: '' },
    lastSubscribedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export type NewsletterSubscriberDocument = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriberModel = model('NewsletterSubscriber', newsletterSubscriberSchema);
