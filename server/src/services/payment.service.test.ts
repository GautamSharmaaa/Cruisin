import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
process.env.RAZORPAY_KEY_SECRET = 'mock_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';

describe('Razorpay payment primitives', () => {
  it('converts decimal INR to integer paise without floating point drift', async () => {
    const { toPaise } = await import('./payment.service.js');
    expect(toPaise(1.1 + 2.2)).toBe(330);
    expect(() => toPaise(0)).toThrow('Invalid payment amount');
  });

  it('accepts only webhook signatures made with the webhook secret', async () => {
    const { PaymentService } = await import('./payment.service.js');
    const body = Buffer.from('{"event":"payment.captured"}');
    const valid = crypto.createHmac('sha256', 'webhook_secret').update(body).digest('hex');
    expect(PaymentService.verifyRazorpayWebhook(body, valid)).toBe(true);
    expect(PaymentService.verifyRazorpayWebhook(body, 'bad-signature')).toBe(false);
  });
});
