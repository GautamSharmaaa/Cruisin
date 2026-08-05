// Governed by .rules v1.0
import sendgrid from '@sendgrid/mail';
import { env } from '../config/env.js';

let sendgridInitialized = false;

const getSendgridClient = (): typeof sendgrid => {
  if (!sendgridInitialized) {
    sendgrid.setApiKey(env.SENDGRID_API_KEY);
    sendgridInitialized = true;
  }
  return sendgrid;
};

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (env.NODE_ENV !== 'production') return;
  await getSendgridClient().send({ from: env.EMAIL_FROM, ...payload });
};
