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

const controller = vi.hoisted(() => ({
  createReturn: vi.fn(),
  createExchange: vi.fn(),
  mine: vi.fn(),
  returns: vi.fn((_req: unknown, res: { json: (value: unknown) => void }): void => res.json({})),
  exchanges: vi.fn((_req: unknown, res: { json: (value: unknown) => void }): void => res.json({})),
  returnAction: vi.fn((_req: unknown, res: { json: (value: unknown) => void }): void => res.json({})),
  exchangeAction: vi.fn((_req: unknown, res: { json: (value: unknown) => void }): void => res.json({}))
}));
vi.mock('../../controllers/return-exchange.controller.js', () => ({ ReturnExchangeController: controller }));

let app: express.Express;
const tokenFor = (role: 'manager' | 'admin' | 'superadmin'): string => jwt.sign({ userId: '000000000000000000000001', email: `${role}@test.local`, role }, process.env.JWT_ACCESS_SECRET as string);

beforeAll(async () => {
  const [{ adminReturnRouter, adminExchangeRouter }, { errorHandler }] = await Promise.all([
    import('./return-exchange.routes.js'),
    import('../../middleware/error.middleware.js')
  ]);
  app = express();
  app.use(express.json());
  app.use('/admin/returns', adminReturnRouter);
  app.use('/admin/exchanges', adminExchangeRouter);
  app.use(errorHandler);
});

describe('return and exchange Shiprocket mutation access', () => {
  it('lets managers read and perform local workflow actions but blocks provider mutations', async () => {
    expect((await request(app).get('/admin/returns').set('Authorization', `Bearer ${tokenFor('manager')}`)).status).toBe(200);
    expect((await request(app).post('/admin/returns/000000000000000000000002/action').set('Authorization', `Bearer ${tokenFor('manager')}`).send({ action: 'approved' })).status).toBe(200);
    expect((await request(app).post('/admin/returns/000000000000000000000002/action').set('Authorization', `Bearer ${tokenFor('manager')}`).send({ action: 'create_reverse_pickup' })).status).toBe(403);
    expect((await request(app).post('/admin/exchanges/000000000000000000000002/action').set('Authorization', `Bearer ${tokenFor('manager')}`).send({ action: 'replacement_shipped' })).status).toBe(403);
  });

  it.each(['admin', 'superadmin'] as const)('allows %s to trigger provider-backed workflow actions', async (role) => {
    const response = await request(app).post('/admin/returns/000000000000000000000002/action').set('Authorization', `Bearer ${tokenFor(role)}`).send({ action: 'create_reverse_pickup' });
    expect(response.status).toBe(200);
  });
});
