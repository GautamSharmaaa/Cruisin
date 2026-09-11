// Governed by .rules v1.0
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
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

const { controller } = vi.hoisted(() => {
  const noop = (_req: unknown, res: { json: (value: unknown) => void }): void => res.json({});
  return {
    controller: {
      quote: vi.fn(noop), tracking: vi.fn(noop), list: vi.fn(noop), ndr: vi.fn(noop), rto: vi.fn(noop), byId: vi.fn(noop), kpis: vi.fn(noop), syncHealth: vi.fn(noop), analytics: vi.fn(noop), jobs: vi.fn(noop), notifications: vi.fn(noop),
      createOrder: vi.fn(noop), compareCouriers: vi.fn(noop), confirmPackage: vi.fn(noop), assignAwb: vi.fn(noop), schedulePickup: vi.fn(noop),
      document: vi.fn(() => noop), documentAccess: vi.fn(noop), track: vi.fn(noop), sync: vi.fn(noop), bulkSync: vi.fn(noop), cancel: vi.fn(noop), ndrAction: vi.fn(noop), rtoWarehouse: vi.fn(noop)
    }
  };
});

vi.mock('../../controllers/logistics.controller.js', () => ({ LogisticsController: controller }));

let app: express.Express;
const tokenFor = (role: 'customer' | 'viewer' | 'manager' | 'admin' | 'superadmin'): string => jwt.sign({ userId: '000000000000000000000001', email: `${role}@test.local`, role }, process.env.JWT_ACCESS_SECRET as string);

beforeAll(async () => {
  const [{ logisticsRouter, adminLogisticsRouter }, { errorHandler }] = await Promise.all([
    import('./logistics.routes.js'),
    import('../../middleware/error.middleware.js')
  ]);
  app = express();
  app.use(express.json());
  app.use('/logistics', logisticsRouter);
  app.use('/admin/logistics', adminLogisticsRouter);
  app.use(errorHandler);
});

describe('logistics route access control', () => {
  it('requires authentication for customer quotes', async () => {
    const response = await request(app).post('/logistics/quotes').send({ deliveryPostcode: '560001', paymentMode: 'prepaid' });
    expect(response.status).toBe(401);
  });

  it('rejects customer access to logistics operations', async () => {
    const response = await request(app).get('/admin/logistics').set('Authorization', `Bearer ${tokenFor('customer')}`);
    expect(response.status).toBe(403);
    const document = await request(app).get('/admin/logistics/000000000000000000000002/documents/label').set('Authorization', `Bearer ${tokenFor('customer')}`);
    expect(document.status).toBe(403);
  });

  it('allows viewers to read ordinary logistics state but not documents or mutations', async () => {
    const read = await request(app).get('/admin/logistics').set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(read.status).toBe(200);
    const write = await request(app).post('/admin/logistics/000000000000000000000002/assign-awb').set('Authorization', `Bearer ${tokenFor('viewer')}`).send({});
    expect(write.status).toBe(403);
    const notifications = await request(app).get('/admin/logistics/notifications?status=failed').set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(notifications.status).toBe(200);
    const document = await request(app).get('/admin/logistics/000000000000000000000002/documents/label').set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(document.status).toBe(403);
    const generate = await request(app).post('/admin/logistics/000000000000000000000002/label').set('Authorization', `Bearer ${tokenFor('viewer')}`);
    expect(generate.status).toBe(403);
  });

  it('allows managers to run read-only synchronization but blocks Shiprocket mutations', async () => {
    const sync = await request(app).post('/admin/logistics/sync').set('Authorization', `Bearer ${tokenFor('manager')}`).send({});
    expect(sync.status).toBe(200);
    const document = await request(app).get('/admin/logistics/000000000000000000000002/documents/label').set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(document.status).toBe(403);
    for (const path of [
      '/admin/logistics/orders/000000000000000000000002/create',
      '/admin/logistics/000000000000000000000002/assign-awb',
      '/admin/logistics/000000000000000000000002/schedule-pickup',
      '/admin/logistics/000000000000000000000002/label',
      '/admin/logistics/000000000000000000000002/invoice',
      '/admin/logistics/000000000000000000000002/manifest',
      '/admin/logistics/000000000000000000000002/cancel'
    ]) {
      const response = await request(app).post(path).set('Authorization', `Bearer ${tokenFor('manager')}`).send({});
      expect(response.status, path).toBe(403);
    }
  });

  it.each(['admin', 'superadmin'] as const)('allows %s to invoke guarded Shiprocket mutations', async (role) => {
    const response = await request(app).post('/admin/logistics/000000000000000000000002/assign-awb').set('Authorization', `Bearer ${tokenFor(role)}`).send({});
    expect(response.status).toBe(200);
    const document = await request(app).get('/admin/logistics/000000000000000000000002/documents/label').set('Authorization', `Bearer ${tokenFor(role)}`);
    expect(document.status).toBe(200);
  });
});
