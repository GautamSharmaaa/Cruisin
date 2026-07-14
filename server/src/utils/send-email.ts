// Governed by .rules v1.0
import sendgrid from '@sendgrid/mail';
import { env } from '../config/env.js';

sendgrid.setApiKey(env.SENDGRID_API_KEY);

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (env.NODE_ENV !== 'production') return;
  await sendgrid.send({ from: env.EMAIL_FROM, ...payload });
};
