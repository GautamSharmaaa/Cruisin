import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
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

const { service } = vi.hoisted(() => ({ service: { active: vi.fn(), admin: vi.fn(), update: vi.fn() } }));
vi.mock('../../services/promotion-experience.service.js', () => ({ PromotionExperienceService: service }));

let app: express.Express;
const tokenFor = (role: 'customer' | 'viewer' | 'manager' | 'admin'): string => jwt.sign({ userId: '665f6d8403bd2edc93800000', email: `${role}@cruisin.local`, role }, process.env.JWT_ACCESS_SECRET as string);
const body = {
  enabled: true,
  promotionId: '665f6d8403bd2edc93800001',
  campaignName: 'August offer',
  campaignKey: 'august-offer',
  popupEnabled: true,
  bagMarqueeEnabled: true,
  checkoutStripEnabled: true,
  popupEyebrow: 'PRIVATE OFFER',
  popupHeadline: '{{discount}} OFF',
  popupDescription: 'Use {{code}}',
  popupPrimaryCta: 'APPLY',
  popupSecondaryCta: 'CONTINUE',
  marqueeAvailableText: '{{code}} AVAILABLE',
  marqueeAppliedText: '{{code}} APPLIED · {{saving}}',
  checkoutAvailableText: '{{code}} AVAILABLE',
  checkoutAppliedText: '{{code}} APPLIED · {{saving}}',
  popupDelayMs: 2500,
  popupFrequency: 'once_per_session',
  startsAt: null,
  endsAt: null
};

beforeAll(async () => {
  const { promotionExperienceAdminRouter, promotionExperienceRouter } = await import('./promotion-experience.routes.js');
  const { errorHandler } = await import('../../middleware/error.middleware.js');
  app = express();
  app.use(express.json());
  app.use('/promotion-experience', promotionExperienceRouter);
  app.use('/admin/promotion-experience', promotionExperienceAdminRouter);
  app.use(errorHandler);
});
beforeEach(() => vi.clearAllMocks());

describe('promotion experience routes', () => {
  it('serves a no-store public-safe response without auth', async () => {
    service.active.mockResolvedValue({ enabled: true, campaignKey: 'august-offer' });
    const response = await request(app).get('/promotion-experience');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body.data.campaignKey).toBe('august-offer');
  });

  it('denies anonymous and customer Admin access', async () => {
    expect((await request(app).get('/admin/promotion-experience')).status).toBe(401);
    expect((await request(app).get('/admin/promotion-experience').set('Authorization', `Bearer ${tokenFor('customer')}`)).status).toBe(403);
  });

  it('allows Admin-role reads but blocks viewer mutations', async () => {
    service.admin.mockResolvedValue({ status: 'disabled', config: { enabled: false } });
    expect((await request(app).get('/admin/promotion-experience').set('Authorization', `Bearer ${tokenFor('viewer')}`)).status).toBe(200);
    expect((await request(app).put('/admin/promotion-experience').set('Authorization', `Bearer ${tokenFor('viewer')}`).send(body)).status).toBe(403);
  });

  it('validates and allows manager mutations', async () => {
    service.update.mockResolvedValue({ status: 'live', config: body });
    const response = await request(app).put('/admin/promotion-experience').set('Authorization', `Bearer ${tokenFor('manager')}`).send(body);
    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(expect.objectContaining({ campaignKey: 'august-offer' }), '665f6d8403bd2edc93800000');
  });

  it('rejects invalid placeholders before mutation', async () => {
    const response = await request(app).put('/admin/promotion-experience').set('Authorization', `Bearer ${tokenFor('admin')}`).send({ ...body, popupHeadline: '{{secret}}' });
    expect(response.status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
