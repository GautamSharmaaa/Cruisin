// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { CategoryModel } from '../models/category.model.js';
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { LogisticsJobModel } from '../models/logistics-job.model.js';
import { LogisticsNotificationEventModel } from '../models/logistics-notification-event.model.js';
import { LogisticsQuoteModel } from '../models/logistics-quote.model.js';
import { LogisticsWebhookEventModel } from '../models/logistics-webhook-event.model.js';
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
    { label: 'job dedupe', model: LogisticsJobModel, key: { dedupeKey: 1 }, unique: true },
    { label: 'job lease', model: LogisticsJobModel, key: { status: 1, runAt: 1, leaseExpiresAt: 1 } },
    { label: 'webhook fingerprint', model: LogisticsWebhookEventModel, key: { provider: 1, fingerprint: 1 }, unique: true },
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
    await removeLegacyIndexes();
    for (const model of applicationModels) {
      await model.createIndexes();
      logger.info('MongoDB indexes ensured', { model: model.modelName });
    }
    await verifyCriticalIndexes();
  } finally {
    await disconnectDb();
  }
};

void ensureIndexes().catch((error: unknown) => {
  logger.error('MongoDB index deployment failed', { error });
  process.exitCode = 1;
});
