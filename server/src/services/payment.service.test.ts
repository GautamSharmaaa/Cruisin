import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGet, axiosPost } = vi.hoisted(() => ({ axiosGet: vi.fn(), axiosPost: vi.fn() }));
vi.mock('axios', () => ({
  default: {
    get: axiosGet,
    post: axiosPost,
    isAxiosError: (error: unknown): boolean => typeof error === 'object' && error !== null && 'isAxiosError' in error
  }
}));

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
  beforeEach(() => vi.clearAllMocks());

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

  it('sends an amount for a partial refund and the idempotency header', async () => {
    axiosGet.mockResolvedValue({ data: { amount: 2_320_200, amount_refunded: 0 } });
    axiosPost.mockResolvedValue({ data: { id: 'rfnd_partial', status: 'processed' } });
    const { RazorpayProvider } = await import('./payment.service.js');

    await new RazorpayProvider().createRefund('pay_test', 5_000, '77777777-7777-4777-8777-777777777777');

    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/payments/pay_test/refund'),
      expect.objectContaining({ amount: 500_000 }),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Refund-Idempotency': '77777777-7777-4777-8777-777777777777' }) })
    );
  });

  it('omits amount when refunding the provider remaining balance in full', async () => {
    axiosGet.mockResolvedValue({ data: { amount: 2_320_200, amount_refunded: 500_000 } });
    axiosPost.mockResolvedValue({ data: { id: 'rfnd_full', status: 'processed' } });
    const { RazorpayProvider } = await import('./payment.service.js');

    await new RazorpayProvider().createRefund('pay_test', 18_202, '88888888-8888-4888-8888-888888888888');

    expect(axiosPost.mock.calls[0]?.[1]).not.toHaveProperty('amount');
  });
});
