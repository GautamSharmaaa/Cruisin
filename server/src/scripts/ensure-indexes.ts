// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { CategoryModel } from '../models/category.model.js';
import { CartModel } from '../models/cart.model.js';
import { CouponRedemptionModel } from '../models/coupon-redemption.model.js';
import { CouponUsageCounterModel } from '../models/coupon-usage-counter.model.js';
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { LogisticsJobModel } from '../models/logistics-job.model.js';
import { LogisticsNotificationEventModel } from '../models/logistics-notification-event.model.js';
import { LogisticsQuoteModel } from '../models/logistics-quote.model.js';
import { LogisticsWebhookEventModel } from '../models/logistics-webhook-event.model.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentWebhookEventModel } from '../models/payment-webhook-event.model.js';
import { applicationModels } from '../models/model-registry.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { WalletModel } from '../models/wallet.model.js';
import { logger } from '../utils/logger.js';
import { validateIndexTarget } from './index-target.js';
import { assertShipmentIndexesReadyForDeployment } from './shipment-index-migration.js';

interface MongoErrorLike {
  code?: number;
}

interface DuplicateCheck {
  label: string;
  run: () => Promise<unknown[]>;
}

const assertCriticalUniqueDataReady = async (): Promise<void> => {
  const duplicateChecks: DuplicateCheck[] = [
    {
      label: 'customer cart ownership',
      run: () => CartModel.aggregate([
        { $match: { user: { $type: 'objectId' } } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'guest cart ownership',
      run: () => CartModel.aggregate([
        { $match: { sessionId: { $type: 'string' } } },
        { $group: { _id: '$sessionId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'checkout customer idempotency',
      run: () => OrderModel.aggregate([
        { $match: { checkoutIdempotencyKey: { $type: 'string' } } },
        { $group: { _id: { user: '$user', checkoutIdempotencyKey: '$checkoutIdempotencyKey' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'coupon customer counter',
      run: () => CouponUsageCounterModel.aggregate([
        { $group: { _id: { customer: '$customer', coupon: '$coupon' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'coupon redemption sequence',
      run: () => CouponRedemptionModel.aggregate([
        { $group: { _id: { customer: '$customer', coupon: '$coupon', sequence: '$sequence' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'coupon redemption order',
      run: () => CouponRedemptionModel.aggregate([
        { $group: { _id: { order: '$order', coupon: '$coupon' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'durable job dedupe',
      run: () => LogisticsJobModel.aggregate([
        { $group: { _id: '$dedupeKey', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    },
    {
      label: 'payment webhook idempotency',
      run: () => PaymentWebhookEventModel.aggregate([
        { $group: { _id: { provider: '$provider', eventId: '$eventId' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ]).exec()
    }
  ];

  for (const check of duplicateChecks) {
    const duplicates = await check.run();
    if (duplicates.length > 0) {
      throw new Error(`Cannot create critical unique index for ${check.label}: duplicate records must be reconciled first`);
    }
  }
  logger.info('Critical unique-index data preflight passed', { count: duplicateChecks.length });
};

const removeLegacyIndexes = async (): Promise<void> => {
  try {
    const indexes = await CategoryModel.collection.indexes();
    const legacySlugIndex = indexes.find((index) => index.name === 'slug_1' && index.unique);
    if (legacySlugIndex) {
      await CategoryModel.collection.dropIndex('slug_1');
      logger.info('Removed legacy category slug index');
    }
  } catch (error) {
    if ((error as MongoErrorLike).code !== 26) throw error;
  }
};

const removeLegacyGlobalCheckoutIdempotencyIndex = async (): Promise<void> => {
  const indexes = await OrderModel.collection.indexes() as unknown as Array<Record<string, unknown>>;
  const customerScoped = indexes.find((index) => (
    index.unique === true
    && index.key
    && sameKey(index.key as Record<string, unknown>, { user: 1, checkoutIdempotencyKey: 1 })
  ));
  if (!customerScoped) {
    throw new Error('Refusing to remove the legacy checkout idempotency index before the customer-scoped replacement exists');
  }
  const legacyGlobal = indexes.find((index) => (
    index.unique === true
    && index.key
    && sameKey(index.key as Record<string, unknown>, { checkoutIdempotencyKey: 1 })
  ));
  if (!legacyGlobal) return;
  const indexName = typeof legacyGlobal.name === 'string' ? legacyGlobal.name : undefined;
  if (!indexName) throw new Error('Legacy checkout idempotency index has no removable name');
  await OrderModel.collection.dropIndex(indexName);
  logger.info('Removed legacy globally unique checkout idempotency index', { indexName });
};

interface RequiredIndex {
  label: string;
  name?: string;
  model: {
    modelName: string;
    collection: { indexes: () => Promise<unknown> };
  };
  key: Record<string, number>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
}
const sameKey = (actual: Record<string, unknown>, expected: Record<string, number>): boolean => {
  const actualEntries = Object.entries(actual);
  const expectedEntries = Object.entries(expected);
  return actualEntries.length === expectedEntries.length
    && expectedEntries.every(([key, direction], index) => actualEntries[index]?.[0] === key && actualEntries[index]?.[1] === direction);
};
const verifyCriticalIndexes = async (): Promise<void> => {
  const required: RequiredIndex[] = [
    { label: 'customer cart ownership', name: 'cruisin_cart_user_unique', model: CartModel, key: { user: 1 }, unique: true, partialFilterExpression: { user: { $type: 'objectId' } } },
    { label: 'guest cart ownership', name: 'cruisin_cart_session_unique', model: CartModel, key: { sessionId: 1 }, unique: true, partialFilterExpression: { sessionId: { $type: 'string' } } },
    {
      label: 'shipment AWB',
      name: 'cruisin_awb_unique_string',
      model: ShipmentModel,
      key: { awb: 1 },
      unique: true,
      partialFilterExpression: { awb: { $type: 'string' } }
    },
    {
      label: 'shipment provider order ID',
      name: 'cruisin_provider_order_unique_string',
      model: ShipmentModel,
      key: { provider: 1, providerOrderId: 1 },
      unique: true,
      partialFilterExpression: { providerOrderId: { $type: 'string' } }
    },
    {
      label: 'shipment provider shipment ID',
      name: 'cruisin_provider_shipment_unique_string',
      model: ShipmentModel,
      key: { provider: 1, providerShipmentId: 1 },
      unique: true,
      partialFilterExpression: { providerShipmentId: { $type: 'string' } }
    },
    { label: 'shipment idempotency', model: ShipmentModel, key: { provider: 1, idempotencyKey: 1 }, unique: true },
    { label: 'quote ID', model: LogisticsQuoteModel, key: { quoteId: 1 }, unique: true },
    { label: 'quote TTL', model: LogisticsQuoteModel, key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    { label: 'checkout customer idempotency', model: OrderModel, key: { user: 1, checkoutIdempotencyKey: 1 }, unique: true, partialFilterExpression: { checkoutIdempotencyKey: { $type: 'string' } } },
    { label: 'payment reservation recovery', model: OrderModel, key: { stockReserved: 1, stockReservationExpiresAt: 1, paymentStatus: 1 } },
    { label: 'coupon customer counter', model: CouponUsageCounterModel, key: { customer: 1, coupon: 1 }, unique: true },
    { label: 'coupon redemption sequence', model: CouponRedemptionModel, key: { customer: 1, coupon: 1, sequence: 1 }, unique: true },
    { label: 'coupon redemption order', model: CouponRedemptionModel, key: { order: 1, coupon: 1 }, unique: true },
    { label: 'job dedupe', model: LogisticsJobModel, key: { dedupeKey: 1 }, unique: true },
    { label: 'job lease', model: LogisticsJobModel, key: { status: 1, runAt: 1, leaseExpiresAt: 1 } },
    { label: 'webhook fingerprint', model: LogisticsWebhookEventModel, key: { provider: 1, fingerprint: 1 }, unique: true },
    { label: 'payment webhook idempotency', model: PaymentWebhookEventModel, key: { provider: 1, eventId: 1 }, unique: true },
    { label: 'return request idempotency', model: ReturnRequestModel, key: { idempotencyKey: 1 }, unique: true },
    { label: 'return fee provider order', model: ReturnRequestModel, key: { handlingFeeProviderOrderId: 1 }, unique: true, sparse: true },
    { label: 'return fee payment reference', model: ReturnRequestModel, key: { handlingFeePaymentReference: 1 }, unique: true, sparse: true },
    { label: 'return refund destination validation', model: ReturnRequestModel, key: { 'refundDestination.providerValidationId': 1 }, unique: true, sparse: true },
    { label: 'manual refund transfer reference', model: ReturnRequestModel, key: { manualTransferReference: 1 }, unique: true, sparse: true },
    { label: 'wallet customer', model: WalletModel, key: { customer: 1 }, unique: true },
    { label: 'exchange request idempotency', model: ExchangeRequestModel, key: { idempotencyKey: 1 }, unique: true },
    { label: 'notification event dedupe', model: LogisticsNotificationEventModel, key: { dedupeKey: 1 }, unique: true }
  ];
  const cache = new Map<string, Array<Record<string, unknown>>>();
  for (const requirement of required) {
    let indexes = cache.get(requirement.model.modelName);
    if (!indexes) {
      indexes = await requirement.model.collection.indexes() as unknown as Array<Record<string, unknown>>;
      cache.set(requirement.model.modelName, indexes);
    }
    const match = indexes.find((index) => (
      index.key
      && sameKey(index.key as Record<string, unknown>, requirement.key)
      && (requirement.name === undefined || index.name === requirement.name)
    ));
    if (!match
      || (requirement.unique !== undefined && match.unique !== requirement.unique)
      || (requirement.sparse !== undefined && match.sparse !== requirement.sparse)
      || (requirement.expireAfterSeconds !== undefined && Number(match.expireAfterSeconds) !== requirement.expireAfterSeconds)
      || (requirement.partialFilterExpression !== undefined
        && JSON.stringify(match.partialFilterExpression) !== JSON.stringify(requirement.partialFilterExpression))) {
      throw new Error(`Required logistics index is missing or malformed: ${requirement.label}`);
    }
  }
  logger.info('Critical logistics indexes verified', { count: required.length });
};

const ensureIndexes = async (): Promise<void> => {
  const target = validateIndexTarget({
    allowIsolatedValidation: process.env.ALLOW_ISOLATED_INDEX_VALIDATION === 'true',
    appEnv: env.APP_ENV,
    mongoUri: env.MONGODB_URI,
    nodeEnv: env.NODE_ENV
  });
  logger.info('Validated MongoDB index target', target);
  await connectDb();
  try {
    if (target.mode === 'deployed') {
      await assertShipmentIndexesReadyForDeployment(ShipmentModel.collection);
      logger.info('Guarded shipment index migration verified');
    }
    await assertCriticalUniqueDataReady();
    await removeLegacyIndexes();
    for (const model of applicationModels) {
      await model.createIndexes();
      logger.info('MongoDB indexes ensured', { model: model.modelName });
    }
    await removeLegacyGlobalCheckoutIdempotencyIndex();
    await verifyCriticalIndexes();
  } finally {
    await disconnectDb();
  }
};

void ensureIndexes().catch((error: unknown) => {
  logger.error('MongoDB index deployment failed', { error });
  process.exitCode = 1;
});
