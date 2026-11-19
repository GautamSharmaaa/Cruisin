// Governed by .rules v1.0
import { createHash, randomUUID } from 'node:crypto';
import axios from 'axios';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { MetaConsentModel, MetaConversionModel, type MetaGraphEvent } from '../models/meta-conversion.model.js';
import { CartModel } from '../models/cart.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { SiteSettingsModel } from '../models/site-settings.model.js';
import { UserModel } from '../models/user.model.js';
import { metaRouter } from '../routes/v1/meta.routes.js';
import { orderRouter } from '../routes/v1/order.routes.js';
import { errorHandler } from '../middleware/error.middleware.js';
import { collectMetaPurchases, processMetaConversion, sendMetaGraphEvent } from './meta-conversion.service.js';
import { OrderService } from './order.service.js';

const { pixelId, fakeToken } = vi.hoisted(() => ({
  pixelId: '100000000000001',
  fakeToken: 'test-only-meta-credential'
}));

vi.mock('../config/env.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config/env.js')>();
  return { env: { ...original.env, META_PIXEL_ID: pixelId, META_CAPI_ENABLED: true,
    META_CAPI_ACCESS_TOKEN: fakeToken, SHIPROCKET_ENABLED: false } };
});

vi.mock('./payment.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./payment.service.js')>();
  return { ...original, PaymentService: {
    getProvider: () => ({
      createOrder: async (amount: number) => ({ id: 'order_' + randomUUID(), amount, currency: 'INR', provider: 'razorpay' }),
      verifyPayment: async () => true
    }),
    hasCapturedRazorpayPayment: vi.fn().mockResolvedValue(false)
  } };
});

const app = express();
app.use(express.json());
app.use('/meta', metaRouter);
app.use('/orders', orderRouter);
app.use(errorHandler);

const origin = new URL(env.CLIENT_URL).origin;
const browser = (path: string) => request(app).post(path).set('Origin', origin).set('User-Agent', 'Cruisin integration test');
const consent = () => ({ pixelId, consentId: randomUUID(), version: 1 as const, granted: true });
const fbp = 'fb.1.1762902353000.1234567890';
const fbc = 'fb.1.1762902353000.synthetic-click';
const address = {
  fullName: 'Synthetic Customer', line1: '1 Demo Street', line2: '', city: 'Delhi',
  state: 'Delhi', postalCode: '110001', country: 'India', phone: '+919000000001'
};
const email = () => 'meta-' + randomUUID() + '@example.com';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

beforeAll(async () => {
  await mongoose.connect(env.MONGODB_URI);
  await Promise.all([MetaConsentModel.init(), MetaConversionModel.init(), OrderModel.init()]);
});
afterAll(async () => {
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([MetaConsentModel.deleteMany({ pixelId }), MetaConversionModel.deleteMany({ pixelId })]);
});

describe('Meta Conversions API integration', () => {
  it('accepts only consented storefront events and keeps one outbox row across retries', async () => {
    const preference = consent();
    const body = { pixelId, consentId: preference.consentId, fbp, fbc, eventId: 'page:' + randomUUID(), name: 'PageView', path: '/shop' };
    const queue = () => browser('/meta/events').send(body);
    await request(app).post('/meta/consent').set('Origin', 'https://other.example').send(preference).expect(403);
    const noConsent = await queue().expect(200);
    expect(noConsent.body.data).toEqual({ queued: false });
    await browser('/meta/consent').send({ ...preference, source: 'default' }).expect(200);
    expect(await MetaConsentModel.findOne({ pixelId }).lean()).toMatchObject({ source: 'default' });
    await browser('/meta/events').set('Sec-GPC', '1').send(body).expect(200);
    await browser('/meta/events').send({ ...body, path: '/shop?q=private-query' }).expect(400);
    await browser('/meta/events').send({ ...body, name: 'Purchase' }).expect(400);
    await browser('/meta/events').send({ ...body, email: 'synthetic@example.com' }).expect(400);
    await queue().expect(202);
    await queue().expect(202);
    expect(await MetaConversionModel.countDocuments({ pixelId })).toBe(1);

    const send = vi.fn<(event: MetaGraphEvent) => Promise<'retry' | 'sent'>>()
      .mockResolvedValueOnce('retry').mockResolvedValueOnce('sent');
    const now = new Date();
    expect(await processMetaConversion(pixelId, send, now)).toBe(true);
    expect(await processMetaConversion(pixelId, send, now)).toBe(false);
    const retried = await MetaConversionModel.findOne({ pixelId }).lean();
    expect(retried?.attempts).toBe(1);
    expect(retried?.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
    const tried = await Promise.all([
      processMetaConversion(pixelId, send, new Date(+now + 16_000)),
      processMetaConversion(pixelId, send, new Date(+now + 16_000))
    ]);
    expect(tried.sort()).toEqual([false, true]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toEqual(send.mock.calls[1]?.[0]);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      event_name: 'PageView', event_id: body.eventId, event_source_url: origin + '/shop',
      action_source: 'website', user_data: { client_user_agent: 'Cruisin integration test', fbp, fbc }
    });
    expect(await MetaConversionModel.findOne({ pixelId }).lean()).toMatchObject({ status: 'sent', attempts: 2 });
    expect(await MetaConversionModel.findOne({ pixelId }).lean()).not.toHaveProperty('event');
  });

  it('skips a queued event after withdrawal and cannot replay the withdrawn grant', async () => {
    const preference = consent();
    const body = { pixelId, consentId: preference.consentId, eventId: 'search:' + randomUUID(),
      name: 'Search', path: '/shop', search: { content_ids: ['fixture-1'], num_results: 1 } };
    await browser('/meta/consent').send(preference).expect(200);
    await browser('/meta/events').send(body).expect(202);
    await browser('/meta/consent').send({ ...preference, granted: false }).expect(200);
    const replay = await browser('/meta/consent').send(preference).expect(200);
    expect(replay.body.data).toEqual({ granted: false, capiEnabled: false });
    const send = vi.fn().mockResolvedValue('sent');
    expect(await processMetaConversion(pixelId, send)).toBe(true);
    expect(send).not.toHaveBeenCalled();
    expect(await MetaConversionModel.findOne({ pixelId }).lean()).toMatchObject({ status: 'discarded' });
  });

  it.each(['cod', 'online', 'failed', 'no consent'] as const)('uses the real checkout and settlement paths for %s', async (scenario) => {
    const cartEmail = email();
    const user = await UserModel.create({ name: 'Synthetic Customer', email: cartEmail, passwordHash: 'mock',
      emailVerifiedAt: new Date(), isVerified: true });
    const token = jwt.sign({ userId: String(user._id), role: 'customer' }, env.JWT_ACCESS_SECRET);
    const variant = new Types.ObjectId();
    const product = await ProductModel.create({
      slug: 'meta-test-' + randomUUID(), title: 'Synthetic Jacket', description: 'Synthetic product for Meta checks.', richDescription: 'Test product',
      basePrice: 2500, category: new Types.ObjectId(), variants: [{ _id: variant, size: 'M', color: 'Black', stock: 6,
        sku: 'META-' + randomUUID(), colorHex: '#000000', price: 2500 }]
    });
    await SiteSettingsModel.updateOne({ singletonKey: 'global' },
      { $set: { codCheckoutEnabled: true, codFee: 49, standardShippingRate: 90 } }, { upsert: true });
    await CartModel.create({ user: user._id, expiresAt: new Date(Date.now() + 600_000),
      items: [{ product: product._id, variant, quantity: 1, price: 2500 }] });

    const preference = consent();
    if (scenario !== 'no consent') await browser('/meta/consent').send(preference).expect(200);
    const { consentId } = preference;
    const online = scenario === 'online' || scenario === 'failed';
    const checkout = {
      shippingAddress: address, billingAddress: address, paymentMethod: online ? 'razorpay' : 'cod',
      paymentMode: online ? 'online' : 'cod', idempotencyKey: randomUUID(),
      meta: { pixelId, consentId, fbp, fbc }
    };
    const submit = () => browser(online ? '/orders/checkout' : '/orders/cod').set('Authorization', 'Bearer ' + token);
    const placed = await submit().send(checkout).expect(201);
    const orderId = placed.body.data.order._id as string;
    const purchaseId = 'purchase:' + orderId;
    expect(JSON.stringify(placed.body)).not.toContain(consentId);
    expect(placed.body.data.order).not.toHaveProperty('metaAttribution');
    if (online) {
      expect(placed.body.data.order).not.toHaveProperty('metaPurchase');
      expect(await collectMetaPurchases(pixelId)).toBe(0);
      const providerId = placed.body.data.payment.id as string;
      if (scenario === 'online') {
        await OrderService.markPaymentStatus(providerId, 'authorized', { paymentId: 'pay_fixture' });
        expect(await collectMetaPurchases(pixelId)).toBe(0);
        const previousEnvironment = env.APP_ENV;
        try {
          env.APP_ENV = 'staging';
          await expect(OrderService.verifyPayment('razorpay', {
            razorpay_order_id: providerId, razorpay_payment_id: 'pay_fixture', razorpay_signature: 'fixture'
          }, String(user._id))).resolves.toEqual({ verified: false });
        } finally {
          env.APP_ENV = previousEnvironment;
        }
        await OrderService.markPaymentStatus(providerId, 'paid', { paymentId: 'pay_fixture' });
        await OrderService.markPaymentStatus(providerId, 'paid', { paymentId: 'pay_fixture' });
      } else {
        await OrderService.markPaymentStatus(providerId, 'failed');
      }
    } else {
      const retry = await submit().send({ ...checkout, meta: undefined }).expect(201);
      expect(retry.body.data.order._id).toBe(orderId);
    }

    const shouldTrack = scenario === 'online' || scenario === 'cod';
    expect(await collectMetaPurchases(pixelId)).toBe(shouldTrack ? 1 : 0);
    expect(await collectMetaPurchases(pixelId)).toBe(0);
    const result = await request(app).get('/orders/' + orderId).set('Authorization', 'Bearer ' + token).expect(200);
    expect(result.body.data).not.toHaveProperty('metaAttribution');
    const event = await MetaConversionModel.findOne({ pixelId, orderId }).lean();
    if (!shouldTrack) {
      expect(result.body.data).not.toHaveProperty('metaPurchase');
      expect(event).toBeNull();
      return;
    }
    expect(result.body.data.metaPurchase).toMatchObject({ eventId: purchaseId, pixelId });
    expect(event?.event).toMatchObject({
      event_name: 'Purchase', event_id: purchaseId, event_source_url: origin + '/checkout/success',
      user_data: { em: [hash(cartEmail)], fbp, fbc }, custom_data: {
        currency: 'INR', value: result.body.data.total, num_items: 1, order_id: orderId,
        contents: [{ id: String(variant), quantity: 1, item_price: 2500 }]
      }
    });
    expect(JSON.stringify(event?.event)).not.toContain(cartEmail);
    expect(JSON.stringify(event?.event)).not.toContain(address.line1);
  });

  it('sends a documented Graph request with the staging test code and handles API errors', async () => {
    const savedEnvironment = env.APP_ENV;
    const savedCode = env.META_TEST_EVENT_CODE;
    const post = vi.spyOn(axios, 'post');
    try {
      post.mockResolvedValueOnce({ status: 200, data: { events_received: 1 } })
        .mockResolvedValueOnce({ status: 400, data: { error: { is_transient: true } } })
        .mockResolvedValueOnce({ status: 401, data: { error: { code: 190 } } });
      env.APP_ENV = 'staging';
      env.META_TEST_EVENT_CODE = 'TEST_FIXTURE';
      const event: MetaGraphEvent = {
        event_name: 'PageView', event_id: 'page:' + randomUUID(), event_time: Math.floor(Date.now() / 1000),
        event_source_url: origin + '/shop', action_source: 'website', user_data: { client_user_agent: 'Synthetic', fbp }
      };
      await expect(sendMetaGraphEvent(event)).resolves.toBe('sent');
      await expect(sendMetaGraphEvent(event)).resolves.toBe('retry');
      await expect(sendMetaGraphEvent(event)).resolves.toBe('rejected');
      expect(post).toHaveBeenNthCalledWith(1, 'https://graph.facebook.com/' + env.META_GRAPH_API_VERSION + '/' + pixelId + '/events',
        { data: [event], access_token: fakeToken, test_event_code: 'TEST_FIXTURE' },
        expect.objectContaining({ maxRedirects: 0, timeout: 8000 }));
    } finally {
      env.APP_ENV = savedEnvironment;
      env.META_TEST_EVENT_CODE = savedCode;
      post.mockRestore();
    }
  });
});
