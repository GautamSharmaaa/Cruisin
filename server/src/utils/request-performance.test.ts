import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const { logger } = vi.hoisted(() => ({ logger: { info: vi.fn() } }));
vi.mock('./logger.js', () => ({ logger }));

describe('commerce request performance instrumentation', () => {
  it('propagates a safe correlation ID and exposes stage timings to the browser', async () => {
    const { finishPerformanceFlow, recordPerformanceStage, requestPerformanceMiddleware } = await import('./request-performance.js');
    const app = express();
    app.use(requestPerformanceMiddleware);
    app.get('/api/v1/cart/coupon', (_req, res) => {
      recordPerformanceStage('cart.load', () => 1);
      recordPerformanceStage('coupon.calculate', () => 2);
      finishPerformanceFlow('coupon', res);
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/api/v1/cart/coupon')
      .set('x-correlation-id', 'coupon-browser-1234')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('coupon-browser-1234');
    expect(response.headers['server-timing']).toContain('cart_load;dur=');
    expect(response.headers['server-timing']).toContain('coupon_calculate;dur=');
    expect(response.headers['server-timing']).toContain('total;dur=');
    expect(logger.info).toHaveBeenCalledWith('Commerce performance', expect.objectContaining({
      requestId: 'coupon-browser-1234',
      flow: 'coupon',
      totalMs: expect.any(Number),
      stages: expect.objectContaining({ 'cart.load': expect.any(Number), 'coupon.calculate': expect.any(Number) })
    }));
  });

  it('rejects unsafe supplied request IDs and generates a bounded server ID', async () => {
    const { finishPerformanceFlow, requestPerformanceMiddleware } = await import('./request-performance.js');
    const app = express();
    app.use(requestPerformanceMiddleware);
    app.get('/api/v1/orders/cod', (_req, res) => {
      finishPerformanceFlow('checkout', res);
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/api/v1/orders/cod')
      .set('x-correlation-id', 'token=secret value with spaces')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(/^checkout-[a-f0-9]{8}$/);
    expect(response.headers['x-request-id']).not.toContain('secret');
  });
});
