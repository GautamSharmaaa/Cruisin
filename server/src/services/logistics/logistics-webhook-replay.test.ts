// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fingerprints: new Set<string>(),
  eventSave: vi.fn(),
  shipmentSave: vi.fn(),
  orderUpdate: vi.fn(),
  notify: vi.fn()
}));

vi.mock('../../models/logistics-webhook-event.model.js', () => ({
  LogisticsWebhookEventModel: {
    create: vi.fn(async (input: { fingerprint: string }) => {
      if (mocks.fingerprints.has(input.fingerprint)) throw { code: 11000 };
      mocks.fingerprints.add(input.fingerprint);
      return { shipment: undefined, status: 'received', processedAt: undefined, save: mocks.eventSave };
    }),
    findOne: vi.fn(() => ({ select: vi.fn(() => ({ lean: vi.fn(async () => ({ status: 'processed' })) })) }))
  }
}));
vi.mock('../../models/shipment.model.js', () => ({
  ShipmentModel: {
    findOne: vi.fn(async () => ({
      _id: 'shipment-1',
      order: 'order-1',
      shipmentStatus: 'in_transit',
      rawProviderStatus: 'In Transit',
      trackingScans: [],
      deliveredDate: undefined,
      lastTrackingUpdate: undefined,
      save: mocks.shipmentSave
    }))
  }
}));
vi.mock('../../models/order.model.js', () => ({ OrderModel: { updateOne: mocks.orderUpdate } }));
vi.mock('./logistics-notification.service.js', () => ({ LogisticsNotificationService: { emit: mocks.notify } }));

import { LogisticsWebhookService } from './logistics-webhook.service.js';

describe('logistics webhook fixture replay', () => {
  beforeEach(() => {
    mocks.fingerprints.clear();
    vi.clearAllMocks();
    mocks.eventSave.mockResolvedValue(undefined);
    mocks.shipmentSave.mockResolvedValue(undefined);
    mocks.orderUpdate.mockResolvedValue({});
    mocks.notify.mockResolvedValue({});
  });

  it('processes a delivered fixture once and recognizes the exact replay before sending again', async () => {
    const fixture = {
      awb: 'MOCKAWB-REPLAY',
      current_status: 'Delivered',
      status_id: 7,
      scans: [{
        date: '2026-07-28T10:00:00.000Z',
        status: 'Delivered',
        activity: 'Delivered to customer',
        location: 'Bengaluru'
      }]
    };
    await expect(LogisticsWebhookService.process(fixture)).resolves.toEqual({
      accepted: true,
      duplicate: false,
      matched: true
    });
    await expect(LogisticsWebhookService.process(fixture)).resolves.toEqual({
      accepted: true,
      duplicate: true,
      matched: true
    });
    expect(mocks.shipmentSave).toHaveBeenCalledOnce();
    expect(mocks.orderUpdate).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'delivered', source: 'webhook' }));
  });
});
