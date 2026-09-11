import { describe, expect, it } from 'vitest';
import { reverseShipmentRetryDecision } from './reverse-shipment-retry.js';

describe('reverse shipment retry policy', () => {
  it('reuses a failed local shipment instead of creating a duplicate idempotency key', () => {
    expect(reverseShipmentRetryDecision({ shipmentStatus: 'error' })).toBe('retry_existing');
  });

  it('reuses an already-created provider shipment without calling create-return again', () => {
    expect(reverseShipmentRetryDecision({ shipmentStatus: 'provider_order_created', providerShipmentId: 'sr-20' })).toBe('use_existing');
  });

  it('creates a shipment only when the idempotency key has no existing record', () => {
    expect(reverseShipmentRetryDecision(null)).toBe('create');
  });
});
