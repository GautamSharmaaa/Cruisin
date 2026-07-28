// Governed by .rules v1.0
import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-webhook-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';
process.env.SHIPROCKET_MODE = 'mock';
process.env.SHIPROCKET_WEBHOOK_SECRET = 'test-logistics-webhook-secret';

const { processEvent } = vi.hoisted(() => ({ processEvent: vi.fn(async () => ({ accepted: true, duplicate: false, matched: true })) }));
vi.mock('../../services/logistics/logistics-webhook.service.js', () => ({ LogisticsWebhookService: { process: processEvent } }));

let app: express.Express;
beforeAll(async () => {
  const [{ logisticsWebhookRouter }, { errorHandler }] = await Promise.all([
    import('./logistics-webhook.routes.js'),
    import('../../middleware/error.middleware.js')
  ]);
  app = express();
  app.use(express.json());
  app.use('/webhooks', logisticsWebhookRouter);
  app.use(errorHandler);
});

describe('logistics webhook boundary', () => {
  const payload = { awb: 'MOCK123', current_status: 'In Transit' };

  beforeEach(() => {
    processEvent.mockClear();
  });

  it('rejects an invalid API key without processing the payload', async () => {
    const response = await request(app).post('/webhooks/logistics-events').set('x-api-key', 'wrong').send(payload);
    expect(response.status).toBe(401);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it('rejects a missing API key without processing the payload', async () => {
    const response = await request(app).post('/webhooks/logistics-events').send(payload);
    expect(response.status).toBe(401);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it('accepts a validated event with the configured API key', async () => {
    const response = await request(app).post('/webhooks/logistics-events').set('x-api-key', 'test-logistics-webhook-secret').send(payload);
    expect(response.status).toBe(200);
    expect(processEvent).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it('rejects oversized or identifier-free payload shapes', async () => {
    const identifierFree = await request(app).post('/webhooks/logistics-events').set('x-api-key', 'test-logistics-webhook-secret').send({ current_status: 'In Transit' });
    expect(identifierFree.status).toBe(400);
    const oversized = await request(app).post('/webhooks/logistics-events').set('x-api-key', 'test-logistics-webhook-secret').send({ awb: 'MOCK123', current_status: 'x'.repeat(121) });
    expect(oversized.status).toBe(400);
  });

  it('rejects malformed provider timestamps before processing', async () => {
    const response = await request(app).post('/webhooks/logistics-events').set('x-api-key', 'test-logistics-webhook-secret').send({
      awb: 'MOCK123',
      current_status: 'In Transit',
      scans: [{ date: 'not-a-date', status: 'In Transit' }]
    });
    expect(response.status).toBe(400);
    expect(processEvent).not.toHaveBeenCalled();
  });
});
