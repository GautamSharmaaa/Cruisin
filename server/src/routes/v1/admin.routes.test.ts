// Governed by .rules v1.0
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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

const { adminService } = vi.hoisted(() => ({
  adminService: {
    overview: vi.fn(),
    analytics: vi.fn(),
    analyticsSummary: vi.fn()
  }
}));

vi.mock('../../services/admin.service.js', () => ({ AdminService: adminService }));
vi.mock('../../controllers/upload.controller.js', () => ({ UploadController: { signature: vi.fn() } }));
vi.mock('../../controllers/catalogue.controller.js', () => ({
  CatalogueController: {
    dashboard: vi.fn(),
    upload: vi.fn(),
    preview: vi.fn(),
    dryRun: vi.fn(),
    confirm: vi.fn(),
    imports: vi.fn(),
    importById: vi.fn(),
    importErrors: vi.fn(),
    exportCatalogue: vi.fn(),
    exports: vi.fn(),
    exportDownload: vi.fn(),
    settings: vi.fn(),
    updateSettings: vi.fn()
  },
  catalogueCsvUpload: { single: () => (_req: unknown, _res: unknown, next: () => void) => next() }
}));

let app: express.Express;

const tokenFor = (role: 'customer' | 'admin' | 'manager' | 'superadmin' | 'viewer'): string => jwt.sign({ userId: role + '-id', email: role + '@cruisin.local', role }, process.env.JWT_ACCESS_SECRET as string);

beforeAll(async () => {
  const { adminRouter } = await import('./admin.routes.js');
  const { errorHandler } = await import('../../middleware/error.middleware.js');
  app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  app.use(errorHandler);
});

describe('admin analytics route auth', () => {
  it('blocks analytics summary without a token', async () => {
    const response = await request(app).get('/admin/analytics/summary');
    expect(response.status).toBe(401);
    expect(adminService.analyticsSummary).not.toHaveBeenCalled();
  });

  it('blocks analytics summary for non-admin users', async () => {
    const response = await request(app).get('/admin/analytics/summary').set('Authorization', 'Bearer ' + tokenFor('customer'));
    expect(response.status).toBe(403);
    expect(adminService.analyticsSummary).not.toHaveBeenCalled();
  });

  it('blocks customer access to the admin order collection', async () => {
    const response = await request(app).get('/admin/orders').set('Authorization', 'Bearer ' + tokenFor('customer'));
    expect(response.status).toBe(403);
  });

  for (const path of ['/admin/orders/000000000000000000000000/mark-cod-paid', '/admin/orders/000000000000000000000000/mark-partial-paid', '/admin/orders/000000000000000000000000/refund', '/admin/orders/000000000000000000000000/sync-refund']) {
    it(`blocks customer access to ${path}`, async () => {
      const response = await request(app).post(path).set('Authorization', 'Bearer ' + tokenFor('customer')).send({ amount: 1 });
      expect(response.status).toBe(403);
    });
  }

  for (const path of ['/admin/orders/000000000000000000000000/mark-cod-paid', '/admin/orders/000000000000000000000000/mark-partial-paid', '/admin/orders/000000000000000000000000/refund', '/admin/orders/000000000000000000000000/sync-refund']) {
    it(`blocks read-only viewers from financial mutation ${path}`, async () => {
      const response = await request(app).post(path).set('Authorization', 'Bearer ' + tokenFor('viewer')).send({ amount: 1 });
      expect(response.status).toBe(403);
    });
  }

  it('blocks read-only viewers from changing order status', async () => {
    const response = await request(app)
      .patch('/admin/orders/000000000000000000000000/status')
      .set('Authorization', 'Bearer ' + tokenFor('viewer'))
      .send({ status: 'processing' });
    expect(response.status).toBe(403);
  });

  it('allows analytics summary for admins', async () => {
    adminService.analyticsSummary.mockResolvedValue({ summary: { netRevenue: 123 }, revenueByDay: [] });
    const response = await request(app).get('/admin/analytics/summary?preset=last7').set('Authorization', 'Bearer ' + tokenFor('admin'));
    expect(response.status).toBe(200);
    expect(response.body.data.summary.netRevenue).toBe(123);
    expect(adminService.analyticsSummary).toHaveBeenCalledWith(expect.objectContaining({ preset: 'last7' }));
  });

  it.each(['manager', 'admin'] as const)('blocks %s from permanent order deletion', async (role) => {
    const response = await request(app)
      .delete('/admin/orders/000000000000000000000000')
      .set('Authorization', 'Bearer ' + tokenFor(role))
      .send({ orderNumber: 'CR-TEST-1', reason: 'Test cleanup' });
    expect(response.status).toBe(403);
  });

  it('blocks customers from delete eligibility inspection', async () => {
    const response = await request(app)
      .get('/admin/orders/000000000000000000000000/delete-eligibility')
      .set('Authorization', 'Bearer ' + tokenFor('customer'));
    expect(response.status).toBe(403);
  });
});
