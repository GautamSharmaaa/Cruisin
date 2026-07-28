// Governed by .rules v1.0
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'production';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-message-test';
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.TWILIO_ACCOUNT_SID = 'AC-test';
process.env.TWILIO_AUTH_TOKEN = 'twilio-test-token';
process.env.TWILIO_SMS_FROM = '+910000000001';
process.env.TWILIO_WHATSAPP_FROM = '+910000000002';

const createMessage = vi.hoisted(() => vi.fn());
vi.mock('twilio', () => ({
  default: vi.fn(() => ({ messages: { create: createMessage } }))
}));

let sendSms: typeof import('./send-logistics-message.js').sendLogisticsSms;
let sendWhatsapp: typeof import('./send-logistics-message.js').sendLogisticsWhatsapp;

beforeAll(async () => {
  const module = await import('./send-logistics-message.js');
  sendSms = module.sendLogisticsSms;
  sendWhatsapp = module.sendLogisticsWhatsapp;
});

beforeEach(() => {
  createMessage.mockReset();
  createMessage.mockResolvedValue({});
});

describe('optional logistics messaging adapters', () => {
  it('sends SMS through the configured Twilio sender', async () => {
    await sendSms('+919000000001', 'Shipment delivered');
    expect(createMessage).toHaveBeenCalledWith({
      to: '+919000000001',
      from: '+910000000001',
      body: 'Shipment delivered'
    });
  });

  it('normalizes WhatsApp addresses through the configured Twilio sender', async () => {
    await sendWhatsapp('whatsapp:+919000000002', 'Shipment delivered');
    expect(createMessage).toHaveBeenCalledWith({
      to: 'whatsapp:+919000000002',
      from: 'whatsapp:+910000000002',
      body: 'Shipment delivered'
    });
  });
});
