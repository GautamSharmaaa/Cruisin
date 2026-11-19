// Governed by .rules v1.0
import { createHash, randomUUID } from 'node:crypto';
import axios from 'axios';
import {
  isMetaPurchaseConfirmed, META_CONSENT_LIFETIME_MS, META_EVENT_LIFETIME_MS
} from '@cruisin/contracts/meta-commerce';
import { env } from '../config/env.js';
import { MetaConsentModel, MetaConversionModel, type MetaCustomerSignals, type MetaGraphEvent } from '../models/meta-conversion.model.js';
import { OrderModel } from '../models/order.model.js';
import { UserModel } from '../models/user.model.js';
import { logger } from '../utils/logger.js';
import type { MetaConsentInput, MetaEventInput } from '../validators/meta.validator.js';
import { canQueueMeta, isMetaConsentActive, metaConsentRef } from './meta-attribution.js';

const day = 24 * 60 * 60 * 1000;
const keepReceipt = 8 * day;
const claimDuration = 30_000;
const maxAttempts = 8;
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const isDuplicate = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

export async function recordMetaConsent(input: MetaConsentInput): Promise<boolean> {
  if (input.pixelId !== env.META_PIXEL_ID) return false;
  const ref = metaConsentRef(input.pixelId, input.consentId);
  const now = new Date();
  const identity = { pixelId: input.pixelId, version: input.version };
  const expiresAt = new Date(+now + META_CONSENT_LIFETIME_MS);
  if (input.granted) {
    try {
      await MetaConsentModel.updateOne({ _id: ref }, { $setOnInsert: { ...identity, grantedAt: now, expiresAt, source: input.source ?? 'shopper' } }, { upsert: true });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
    return isMetaConsentActive(ref, input.pixelId, now);
  }

  // Leave a tombstone even when the withdrawal arrives before a delayed grant.
  const revoke = { $set: { revokedAt: now, expiresAt }, $unset: { grantedAt: 1 } };
  try {
    await MetaConsentModel.updateOne({ _id: ref }, { ...revoke, $setOnInsert: identity }, { upsert: true });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    await MetaConsentModel.updateOne({ _id: ref }, revoke);
  }
  return false;
}

const webEvent = (
  name: MetaGraphEvent['event_name'], eventId: string, path: string, userData: MetaCustomerSignals,
  occurredAt: Date, customData?: Record<string, unknown>
): MetaGraphEvent => ({
  event_name: name,
  event_id: eventId,
  event_time: Math.floor(+occurredAt / 1000),
  event_source_url: new URL(path, env.CLIENT_URL).href,
  action_source: 'website',
  user_data: userData,
  ...(customData ? { custom_data: customData } : {})
});

const metaContents = (contents: Array<{ id: string; quantity: number; item_price: number }>, value: number) => ({
  contents,
  content_ids: [...new Set(contents.map(item => item.id))],
  content_type: 'product',
  currency: 'INR',
  value,
  num_items: contents.reduce((total, item) => total + item.quantity, 0)
});

async function enqueue(pixelId: string, consentRef: string, event: MetaGraphEvent, orderId?: string): Promise<void> {
  const now = new Date();
  const id = sha256([pixelId, event.event_name, event.event_id].join(':'));
  try {
    await MetaConversionModel.updateOne({ _id: id }, { $setOnInsert: {
      pixelId, consentRef, event, ...(orderId ? { orderId } : {}),
      status: 'queued', attempts: 0, nextAttemptAt: now, expiresAt: new Date(event.event_time * 1000 + META_EVENT_LIFETIME_MS)
    } }, { upsert: true, timestamps: false });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}

export async function enqueueMetaBrowserEvent(input: MetaEventInput, signals: MetaCustomerSignals): Promise<boolean> {
  if (!canQueueMeta() || input.pixelId !== env.META_PIXEL_ID) return false;
  const ref = metaConsentRef(input.pixelId, input.consentId);
  if (!await isMetaConsentActive(ref, input.pixelId)) return false;

  let custom: Record<string, unknown> | undefined;
  if (input.name === 'Search') custom = input.search;
  else if ('commerce' in input) {
    custom = metaContents(input.commerce.contents, input.commerce.value);
    if (input.name === 'AddPaymentInfo' && input.commerce.payment_method) custom.payment_method = input.commerce.payment_method;
  }
  await enqueue(input.pixelId, ref, webEvent(input.name, input.eventId, input.path, signals, new Date(), custom));
  return true;
}

const hashEmail = (email?: string | null): string[] | undefined => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || /\.(local|invalid|test)$/.test(normalized)) return undefined;
  return [sha256(normalized)];
};

const hashPhone = (phone?: string | null): string[] | undefined => {
  const digits = phone?.replace(/\D/g, '').replace(/^0+/, '') ?? '';
  if (!digits) return undefined;
  const international = /^[6-9]\d{9}$/.test(digits) ? '91' + digits : digits;
  return /^[1-9]\d{10,14}$/.test(international) ? [sha256(international)] : undefined;
};

export async function collectMetaPurchases(pixelId: string, now = new Date()): Promise<number> {
  const orders = await OrderModel.find({
    metaPurchasePending: true,
    'metaPurchase.pixelId': pixelId,
    'metaPurchase.confirmedAt': { $gte: new Date(+now - META_EVENT_LIFETIME_MS) },
    'metaAttribution.expiresAt': { $gt: now }
  }).select('metaPurchase items.variant items.quantity items.price total user paymentStatus paymentMode orderStatus isTestOrder isAnalyticsTestData +metaAttribution')
    .sort({ 'metaPurchase.confirmedAt': 1 }).limit(15).lean();

  let queued = 0;
  for (const order of orders) {
    const { metaAttribution: attribution, metaPurchase: purchase } = order;
    if (purchase && attribution && isMetaPurchaseConfirmed(order) && await isMetaConsentActive(attribution.consentRef, pixelId, now)) {
      const contents = order.items.map(item => ({ id: String(item.variant), quantity: item.quantity, item_price: item.price }));
      if (contents.length && order.total >= 0) {
        const user = order.user && await UserModel.findById(order.user)
          .select('email emailVerifiedAt phone phoneVerifiedAt status isAnalyticsTestData').lean();
        const em = user && user.emailVerifiedAt && user.status === 'active' ? hashEmail(user.email) : undefined;
        const ph = user && user.phoneVerifiedAt && user.status === 'active' ? hashPhone(user.phone) : undefined;
        if (!user || user.status !== 'deleted' && !user.isAnalyticsTestData) {
          const signals: MetaCustomerSignals = {
            client_user_agent: attribution.clientUserAgent,
            ...(attribution.clientIp ? { client_ip_address: attribution.clientIp } : {}),
            ...(attribution.fbp ? { fbp: attribution.fbp } : {}),
            ...(attribution.fbc ? { fbc: attribution.fbc } : {}),
            ...(em ? { em } : {}),
            ...(ph ? { ph } : {})
          };
          const orderId = String(order._id);
          await enqueue(pixelId, attribution.consentRef, webEvent('Purchase', purchase.eventId, '/checkout/success',
            signals, purchase.confirmedAt, { ...metaContents(contents, order.total), order_id: orderId }), orderId);
          queued += 1;
        }
      }
    }
    // The outbox's deterministic key makes it safe for another worker to retry
    // if the process stops between inserting the event and clearing attribution.
    await OrderModel.updateOne({ _id: order._id, metaPurchasePending: true }, { $unset: { metaPurchasePending: 1, metaAttribution: 1 } }, { timestamps: false });
  }
  return queued;
}

type Outcome = 'sent' | 'retry' | 'rejected';
export type MetaSender = (event: MetaGraphEvent) => Promise<Outcome>;

export const sendMetaGraphEvent: MetaSender = async (event) => {
  const pixelId = env.META_PIXEL_ID;
  const token = env.META_CAPI_ACCESS_TOKEN;
  if (!canQueueMeta() || !pixelId || !token ||
      (env.APP_ENV !== 'production' && (env.APP_ENV !== 'staging' || !env.META_TEST_EVENT_CODE))) return 'rejected';
  try {
    const response = await axios.post<{ events_received?: number; error?: { code?: number; is_transient?: boolean } }>(
      'https://graph.facebook.com/' + env.META_GRAPH_API_VERSION + '/' + pixelId + '/events',
      { access_token: token, data: [event], ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}) },
      { timeout: 8_000, maxRedirects: 0, validateStatus: () => true }
    );
    if (response.status >= 200 && response.status < 300 && response.data?.events_received === 1) return 'sent';
    const code = response.data?.error?.code ?? 0;
    if (response.status >= 500 || [408, 429].includes(response.status) ||
        response.data?.error?.is_transient || [1, 2, 4, 17, 32, 613].includes(code)) return 'retry';
    return 'rejected';
  } catch {
    // Axios errors can contain request headers and the customer-matching payload.
    return 'retry';
  }
};

export async function processMetaConversion(pixelId: string, send: MetaSender, now = new Date()): Promise<boolean> {
  const claimId = randomUUID();
  const record = await MetaConversionModel.findOneAndUpdate({
    pixelId, status: 'queued', nextAttemptAt: { $lte: now }
  }, { $set: { claimId, nextAttemptAt: new Date(+now + claimDuration) }, $inc: { attempts: 1 } },
  { new: true, sort: { nextAttemptAt: 1 } }).lean();
  if (!record) return false;

  const filter = { _id: record._id, claimId };
  const event = record.event as MetaGraphEvent | undefined;
  const consent = event && (+now - event.event_time * 1000 < META_EVENT_LIFETIME_MS) &&
    await isMetaConsentActive(record.consentRef, pixelId, now);
  const order = consent && record.orderId
    ? await OrderModel.findById(record.orderId).select('orderStatus paymentStatus paymentMode isTestOrder isAnalyticsTestData').lean()
    : undefined;

  let status: 'discarded' | 'failed' | 'sent' = 'discarded';
  let outcome = 'ineligible';
  if (event && consent && (!record.orderId || order && isMetaPurchaseConfirmed(order))) {
    const result = record.attempts > maxAttempts ? 'retry' : await send(event);
    if (result === 'retry' && record.attempts < maxAttempts) {
      const delay = Math.min(15_000 * 2 ** (record.attempts - 1), 3_600_000);
      await MetaConversionModel.updateOne(filter, { $set: { nextAttemptAt: new Date(+now + delay) }, $unset: { claimId: 1 } });
      return true;
    }
    status = result === 'sent' ? 'sent' : 'failed';
    outcome = result === 'sent' ? 'accepted' : result === 'retry' ? 'retries_exhausted' : 'rejected';
  }

  await MetaConversionModel.updateOne(filter, {
    $set: { status, outcome, finishedAt: new Date(), expiresAt: new Date(+now + keepReceipt) },
    $unset: { claimId: 1, event: 1 }
  });
  if (status === 'failed') logger.warn('Meta conversion delivery failed', { eventName: event?.event_name, outcome });
  return true;
}

export const startMetaConversionWorker = (): (() => void) => {
  const pixelId = env.META_PIXEL_ID;
  if (!pixelId) return () => {};
  let running = false;
  let stopped = false;
  let nextCleanup = 0;
  const tick = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      const now = new Date();
      if (+now >= nextCleanup) {
        await OrderModel.updateMany({ 'metaAttribution.expiresAt': { $lte: now } },
          { $unset: { metaAttribution: 1, metaPurchasePending: 1 } }, { timestamps: false });
        nextCleanup = +now + 3_600_000;
      }
      if (!canQueueMeta() || (env.APP_ENV !== 'production' && env.APP_ENV !== 'staging')) return;
      await collectMetaPurchases(pixelId, now);
      for (let index = 0; index < 20 && !stopped && await processMetaConversion(pixelId, sendMetaGraphEvent); index += 1) {
        // Bound concurrent requests and let the next tick resume the backlog.
      }
    } catch {
      logger.error('Meta conversion worker could not process its queue');
    } finally {
      running = false;
    }
  };
  const interval = setInterval(() => { void tick(); }, 2_000);
  interval.unref();
  void tick();
  return () => { stopped = true; clearInterval(interval); };
};
