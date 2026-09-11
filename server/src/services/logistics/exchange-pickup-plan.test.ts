// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { planExchangePickup } from './exchange-pickup-plan.js';

describe('planExchangePickup', () => {
  it('blocks pickup until every submitted product has been approved or rejected', () => {
    expect(planExchangePickup([
      { id: 'exchange-a', status: 'inventory_reserved', hasReverseShipment: false },
      { id: 'exchange-b', status: 'requested', hasReverseShipment: false }
    ])).toEqual({ ready: false, reason: 'awaiting_approval', awaitingApproval: 1 });
  });

  it('creates one deterministic batch for every approved product in an order', () => {
    const first = planExchangePickup([
      { id: 'exchange-b', status: 'inventory_reserved', hasReverseShipment: false },
      { id: 'exchange-a', status: 'inventory_reserved', hasReverseShipment: false }
    ]);
    const replay = planExchangePickup([
      { id: 'exchange-a', status: 'inventory_reserved', hasReverseShipment: false },
      { id: 'exchange-b', status: 'inventory_reserved', hasReverseShipment: false }
    ]);

    expect(first).toEqual(replay);
    expect(first).toMatchObject({ ready: true, requestIds: ['exchange-a', 'exchange-b'] });
  });

  it('does not add products that already belong to a reverse shipment', () => {
    expect(planExchangePickup([
      { id: 'exchange-a', status: 'reverse_pickup', hasReverseShipment: true },
      { id: 'exchange-b', status: 'inventory_reserved', hasReverseShipment: false }
    ])).toMatchObject({ ready: true, requestIds: ['exchange-b'] });
  });
});
