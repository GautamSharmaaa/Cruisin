// Governed by .rules v1.0
import twilio from 'twilio';
import { env } from '../config/env.js';
import { ApiError } from './api-error.js';

const client = (): ReturnType<typeof twilio> => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) throw new ApiError(503, 'Twilio messaging is not configured');
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
};

export const sendLogisticsSms = async (to: string, body: string): Promise<void> => {
  if (env.NODE_ENV !== 'production') throw new ApiError(503, 'Outbound logistics SMS is disabled outside production');
  if (!env.TWILIO_SMS_FROM) throw new ApiError(503, 'Logistics SMS sender is not configured');
  await client().messages.create({ to, from: env.TWILIO_SMS_FROM, body });
};

export const sendLogisticsWhatsapp = async (to: string, body: string): Promise<void> => {
  if (env.NODE_ENV !== 'production') throw new ApiError(503, 'Outbound logistics WhatsApp is disabled outside production');
  if (!env.TWILIO_WHATSAPP_FROM) throw new ApiError(503, 'Logistics WhatsApp sender is not configured');
  await client().messages.create({
    to: `whatsapp:${to.replace(/^whatsapp:/, '')}`,
    from: `whatsapp:${env.TWILIO_WHATSAPP_FROM.replace(/^whatsapp:/, '')}`,
    body
  });
};
