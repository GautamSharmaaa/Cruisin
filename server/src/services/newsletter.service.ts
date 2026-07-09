// Governed by .rules v1.0
import { createHash } from 'node:crypto';
import { NewsletterSubscriberModel } from '../models/newsletter-subscriber.model.js';

export interface NewsletterSubscribeInput {
  email: string;
  source?: string;
  consent?: boolean;
  userAgent?: string;
  ip?: string;
}

const hashIp = (ip?: string): string => ip ? createHash('sha256').update(ip).digest('hex') : '';

export const NewsletterService = {
  async subscribe(input: NewsletterSubscribeInput): Promise<{ email: string; duplicate: boolean; source: string }> {
    const email = input.email.trim().toLowerCase();
    const source = input.source?.trim() || 'homepage';
    const existing = await NewsletterSubscriberModel.findOne({ email });
    if (existing) return { email: existing.email, duplicate: true, source: existing.source };
    const subscriber = await NewsletterSubscriberModel.create({
      email,
      source,
      consent: input.consent ?? true,
      userAgent: input.userAgent ?? '',
      ipHash: hashIp(input.ip),
      lastSubscribedAt: new Date()
    });
    return { email: subscriber.email, duplicate: false, source: subscriber.source };
  }
};
