// Governed by .rules v1.0
import { OAuth2Client } from 'google-auth-library';
import twilio from 'twilio';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

export interface GoogleIdentity {
  providerUserId: string;
  email: string;
  name: string;
  avatar?: string;
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const IdentityProviderService = {
  async verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
    if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Google login is not configured');
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new ApiError(401, 'Google identity could not be verified');
    return { providerUserId: payload.sub, email: payload.email, name: payload.name ?? payload.email.split('@')[0] ?? 'Cruisin Member', avatar: payload.picture };
  },
  async sendOtp(phone: string, channel: 'whatsapp', otp: string): Promise<void> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      if (env.NODE_ENV === 'production') throw new ApiError(503, 'OTP delivery is not configured');
      logger.info('Development OTP generated', { phone, channel });
      return;
    }
    const from = env.TWILIO_WHATSAPP_FROM;
    if (!from) throw new ApiError(503, 'WhatsApp delivery is not configured');
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ body: 'Your Cruisin verification code is ' + otp + '. It expires in 5 minutes.', from: 'whatsapp:' + from.replace(/^whatsapp:/, ''), to: 'whatsapp:' + phone.replace(/^whatsapp:/, '') });
  }
};
