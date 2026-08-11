import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'production';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_identity';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.TWILIO_ACCOUNT_SID = 'AC-test';
process.env.TWILIO_AUTH_TOKEN = 'twilio-test-token';
process.env.TWILIO_WHATSAPP_FROM = '+918826608612';
process.env.TWILIO_WHATSAPP_CONTENT_SID = 'HX0123456789abcdef0123456789abcdef';

const createMessage = vi.hoisted(() => vi.fn());
vi.mock('twilio', () => ({
  default: vi.fn(() => ({ messages: { create: createMessage } }))
}));

let sendOtp: typeof import('./identity-provider.service.js').IdentityProviderService.sendOtp;

beforeAll(async () => {
  const module = await import('./identity-provider.service.js');
  sendOtp = module.IdentityProviderService.sendOtp;
});

beforeEach(() => {
  createMessage.mockReset();
  createMessage.mockResolvedValue({});
});

describe('WhatsApp OTP delivery', () => {
  it('uses the approved authentication content template', async () => {
    await sendOtp('+919876543210', 'whatsapp', '123456');

    expect(createMessage).toHaveBeenCalledWith({
      from: 'whatsapp:+918826608612',
      to: 'whatsapp:+919876543210',
      contentSid: 'HX0123456789abcdef0123456789abcdef',
      contentVariables: JSON.stringify({ 1: '123456' })
    });
  });
});
