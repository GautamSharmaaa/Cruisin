// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { ExchangeRequestModel } from '../../models/exchange-request.model.js';
import { LogisticsJobModel } from '../../models/logistics-job.model.js';
import { LogisticsNotificationEventModel } from '../../models/logistics-notification-event.model.js';
import { LogisticsQuoteModel } from '../../models/logistics-quote.model.js';
import { LogisticsWebhookEventModel } from '../../models/logistics-webhook-event.model.js';
import { ReturnRequestModel } from '../../models/return-request.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';

type Index = [Record<string, number>, Record<string, unknown>];
const expectIndex = (
  indexes: Index[],
  key: Record<string, number>,
  options: Record<string, unknown> = {}
): void => {
  const expectedEntries = Object.entries(key);
  const match = indexes.find(([fields]) => {
    const actualEntries = Object.entries(fields);
    return actualEntries.length === expectedEntries.length
      && expectedEntries.every(([name, direction], index) => actualEntries[index]?.[0] === name && actualEntries[index]?.[1] === direction);
  });
  expect(match, `Missing index ${JSON.stringify(key)}`).toBeDefined();
  expect(match?.[1]).toMatchObject(options);
};

describe('critical production logistics index contract', () => {
  it('declares every required unique, TTL, lease and dedupe index', () => {
    const shipment = ShipmentModel.schema.indexes() as Index[];
    expectIndex(shipment, { awb: 1 }, {
      unique: true,
      partialFilterExpression: { awb: { $type: 'string' } }
    });
    expectIndex(shipment, { provider: 1, providerOrderId: 1 }, {
      unique: true,
      partialFilterExpression: { providerOrderId: { $type: 'string' } }
    });
    expectIndex(shipment, { provider: 1, providerShipmentId: 1 }, {
      unique: true,
      partialFilterExpression: { providerShipmentId: { $type: 'string' } }
    });
    expectIndex(shipment, { provider: 1, idempotencyKey: 1 }, { unique: true });

    const quote = LogisticsQuoteModel.schema.indexes() as Index[];
    expectIndex(quote, { quoteId: 1 }, { unique: true });
    expectIndex(quote, { expiresAt: 1 }, { expireAfterSeconds: 0 });

    const job = LogisticsJobModel.schema.indexes() as Index[];
    expectIndex(job, { dedupeKey: 1 }, { unique: true });
    expectIndex(job, { status: 1, runAt: 1, leaseExpiresAt: 1 });

    expectIndex(LogisticsWebhookEventModel.schema.indexes() as Index[], { provider: 1, fingerprint: 1 }, { unique: true });
    expectIndex(ReturnRequestModel.schema.indexes() as Index[], { idempotencyKey: 1 }, { unique: true });
    expectIndex(ExchangeRequestModel.schema.indexes() as Index[], { idempotencyKey: 1 }, { unique: true });
    expectIndex(LogisticsNotificationEventModel.schema.indexes() as Index[], { dedupeKey: 1 }, { unique: true });
  });
});
