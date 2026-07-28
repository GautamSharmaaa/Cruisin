// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { LogisticsJobModel } from '../models/logistics-job.model.js';
import { LogisticsNotificationEventModel } from '../models/logistics-notification-event.model.js';
import { LogisticsQuoteModel } from '../models/logistics-quote.model.js';
import { LogisticsWebhookEventModel } from '../models/logistics-webhook-event.model.js';
import { applicationModels } from '../models/model-registry.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { logger } from '../utils/logger.js';

const ISOLATED_INDEX_DATABASE = 'cruisin-logistics-indexes';
const LOCAL_MONGODB_HOSTS = new Set(['localhost', '127.0.0.1']);

const validateIsolatedIndexTarget = (): void => {
  if (process.env.ALLOW_ISOLATED_INDEX_VALIDATION !== 'true') {
    throw new Error('Refusing index validation without ALLOW_ISOLATED_INDEX_VALIDATION=true');
  }

  let parsed: URL;
  try {
    parsed = new URL(env.MONGODB_URI);
  } catch {
    throw new Error('Refusing index validation because MONGODB_URI is invalid');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (parsed.protocol !== 'mongodb:' || !LOCAL_MONGODB_HOSTS.has(parsed.hostname)) {
    throw new Error('Refusing index validation unless MONGODB_URI uses localhost or 127.0.0.1');
  }
  if (database !== ISOLATED_INDEX_DATABASE) {
    throw new Error(`Refusing index validation unless the database is exactly ${ISOLATED_INDEX_DATABASE}`);
  }

  const sanitizedHost = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  logger.info('Validated isolated MongoDB index target', { host: sanitizedHost, database });
};

interface RequiredIndex {
  label: string;
  model: {
    modelName: string;
    collection: { indexes: () => Promise<unknown> };
  };
  key: Record<string, number>;
  unique?: boolean;
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
      model: ShipmentModel,
      key: { awb: 1 },
      unique: true,
      partialFilterExpression: { awb: { $type: 'string' } }
    },
    {
      label: 'shipment provider order ID',
      model: ShipmentModel,
      key: { provider: 1, providerOrderId: 1 },
      unique: true,
      partialFilterExpression: { providerOrderId: { $type: 'string' } }
    },
    {
      label: 'shipment provider shipment ID',
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
    const match = indexes.find((index) => index.key && sameKey(index.key as Record<string, unknown>, requirement.key));
    if (!match
      || (requirement.unique !== undefined && match.unique !== requirement.unique)
      || (requirement.expireAfterSeconds !== undefined && Number(match.expireAfterSeconds) !== requirement.expireAfterSeconds)
      || (requirement.partialFilterExpression !== undefined
        && JSON.stringify(match.partialFilterExpression) !== JSON.stringify(requirement.partialFilterExpression))) {
      throw new Error(`Required logistics index is missing or malformed: ${requirement.label}`);
    }
  }
  logger.info('Critical logistics indexes verified', { count: required.length });
};

const ensureIndexes = async (): Promise<void> => {
  validateIsolatedIndexTarget();
  await connectDb();
  try {
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
