import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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
process.env.RAZORPAY_KEY_ID = 'test';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';

const { orderController, paymentController } = vi.hoisted(() => {
  const noop = (_req: unknown, _res: unknown): void => undefined;
  return {
    orderController: { checkout: vi.fn(noop), cod: vi.fn(noop), verify: vi.fn(noop), mine: vi.fn(noop), all: vi.fn(noop), byId: vi.fn(noop), updateStatus: vi.fn(noop), customerCancel: vi.fn(noop), syncRefund: vi.fn(noop), paymentStatus: vi.fn(noop), markCodPaid: vi.fn(noop), markPartialPaid: vi.fn(noop) },
    paymentController: { config: vi.fn(noop), stripeWebhook: vi.fn(noop), razorpayWebhook: vi.fn(noop), refund: vi.fn(noop) }
  };
});

vi.mock('../../controllers/order.controller.js', () => ({ OrderController: orderController }));
vi.mock('../../controllers/payment.controller.js', () => ({ PaymentController: paymentController }));

let app: express.Express;

beforeAll(async () => {
  const [{ orderRouter }, { paymentRouter }, { errorHandler }] = await Promise.all([
    import('./order.routes.js'),
    import('./payment.routes.js'),
    import('../../middleware/error.middleware.js')
  ]);
  app = express();
  app.use(express.json());
  app.use('/orders', orderRouter);
  app.use('/payments', paymentRouter);
  app.use(errorHandler);
});

describe('checkout and order access', () => {
  const anonymousRequests = [
    ['post', '/orders/checkout'],
    ['post', '/orders/cod'],
    ['post', '/orders/partial/create'],
    ['post', '/orders/verify-payment'],
    ['post', '/payments/razorpay/create-order'],
    ['post', '/payments/razorpay/verify'],
    ['get', '/orders/mine'],
    ['get', '/orders/000000000000000000000000'],
    ['post', '/orders/000000000000000000000000/cancel'],
    ['get', '/orders/000000000000000000000000/payment-status']
  ] as const;

  for (const [method, path] of anonymousRequests) {
    it(`rejects anonymous ${method.toUpperCase()} ${path}`, async () => {
      const response = await request(app)[method](path).send({});
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Please sign in to continue.');
    });
  }
});
