// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventSave: vi.fn(),
  eventCreate: vi.fn(),
  shipmentFind: vi.fn(),
  shipmentSave: vi.fn(),
  orderUpdate: vi.fn(),
  notify: vi.fn(),
  shipment: {} as Record<string, any>
}));

vi.mock('../../models/logistics-webhook-event.model.js', () => ({
  LogisticsWebhookEventModel: { create: mocks.eventCreate }
}));
vi.mock('../../models/shipment.model.js', () => ({
  ShipmentModel: { findOne: mocks.shipmentFind }
}));
vi.mock('../../models/order.model.js', () => ({
  OrderModel: { updateOne: mocks.orderUpdate }
}));
vi.mock('./logistics-notification.service.js', () => ({
  LogisticsNotificationService: { emit: mocks.notify }
}));

import { LogisticsWebhookService } from './logistics-webhook.service.js';

const resetShipment = (status = 'in_transit'): void => {
  mocks.shipment = {
    _id: 'shipment-contract',
    order: 'order-contract',
    shipmentStatus: status,
    rawProviderStatus: status,
    providerStatusId: undefined,
    trackingScans: [],
    deliveredDate: undefined,
    lastTrackingUpdate: undefined,
    ndr: { attemptCount: 0 },
    rto: {},
    save: mocks.shipmentSave
  };
};

describe('webhook lookup, ordering and terminal-state contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetShipment();
    mocks.eventCreate.mockImplementation(async () => ({
      shipment: undefined,
      status: 'received',
      processedAt: undefined,
      save: mocks.eventSave
    }));
    mocks.shipmentFind.mockImplementation(async () => mocks.shipment);
    mocks.eventSave.mockResolvedValue(undefined);
    mocks.shipmentSave.mockResolvedValue(undefined);
    mocks.orderUpdate.mockResolvedValue({});
    mocks.notify.mockResolvedValue({});
  });

  it('looks up by AWB, provider shipment ID, then provider order ID in strict priority', async () => {
    mocks.shipmentFind.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await LogisticsWebhookService.process({
      awb: 'AWB-QA',
      order_id: 'ORDER-QA',
      shipment_id: 'SHIPMENT-QA',
      current_status: 'In Transit'
    });
    expect(mocks.shipmentFind).toHaveBeenNthCalledWith(1, { awb: 'AWB-QA' });
    expect(mocks.shipmentFind).toHaveBeenNthCalledWith(2, { providerShipmentId: 'SHIPMENT-QA' });
    expect(mocks.shipmentFind).toHaveBeenNthCalledWith(3, { providerOrderId: 'ORDER-QA' });
  });

  it('does not reuse a provider order ID as an untrusted local source-order fallback', async () => {
    mocks.shipmentFind.mockResolvedValueOnce(null);
    await LogisticsWebhookService.process({ order_id: 'PROVIDER-ORDER-QA', current_status: 'In Transit' });
    expect(mocks.shipmentFind).toHaveBeenCalledTimes(1);
    expect(mocks.shipmentFind).toHaveBeenCalledWith({ providerOrderId: 'PROVIDER-ORDER-QA' });
  });

  it('uses an explicit channel order ID only after provider identifiers miss', async () => {
    mocks.shipmentFind.mockResolvedValueOnce(null).mockResolvedValueOnce(mocks.shipment);
    await LogisticsWebhookService.process({
      order_id: 'PROVIDER-ORDER-QA',
      channel_order_id: 'CR-TRUSTED-QA',
      current_status: 'In Transit'
    });
    expect(mocks.shipmentFind).toHaveBeenNthCalledWith(1, { providerOrderId: 'PROVIDER-ORDER-QA' });
    expect(mocks.shipmentFind).toHaveBeenNthCalledWith(2, { sourceOrderId: 'CR-TRUSTED-QA' });
  });

  it('accepts but ignores an unmatched provider event safely', async () => {
    mocks.shipmentFind.mockResolvedValueOnce(null);
    await expect(LogisticsWebhookService.process({ awb: 'UNKNOWN-AWB', current_status: 'In Transit' })).resolves.toEqual({
      accepted: true,
      duplicate: false,
      matched: false
    });
    expect(mocks.shipmentSave).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.eventSave).toHaveBeenCalledOnce();
  });

  it.each(['delivered', 'cancelled', 'rto_delivered'])('does not downgrade terminal status %s', async (terminalStatus) => {
    resetShipment(terminalStatus);
    await LogisticsWebhookService.process({ awb: 'TERMINAL-AWB', current_status: 'In Transit' });
    expect(mocks.shipment.shipmentStatus).toBe(terminalStatus);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('ignores unknown status transitions while retaining a safe audit record', async () => {
    await LogisticsWebhookService.process({ awb: 'UNKNOWN-STATUS-AWB', current_status: 'Provider Mystery State' });
    expect(mocks.shipment.shipmentStatus).toBe('in_transit');
    expect(mocks.shipmentSave).toHaveBeenCalledOnce();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('deduplicates identical scans even when a later provider event has different raw text', async () => {
    const scan = {
      date: '2026-07-28T10:00:00.000Z',
      status: 'In Transit',
      activity: 'Reached destination hub',
      location: 'Bengaluru'
    };
    await LogisticsWebhookService.process({ awb: 'SCAN-AWB', current_status: 'In Transit', scans: [scan] });
    await LogisticsWebhookService.process({ awb: 'SCAN-AWB', current_status: 'IN  TRANSIT', scans: [scan] });
    expect(mocks.shipment.trackingScans).toHaveLength(1);
  });

  it('records NDR and RTO operational state without duplicating inventory work', async () => {
    await LogisticsWebhookService.process({
      awb: 'NDR-AWB',
      current_status: 'NDR',
      scans: [{ date: '2026-07-28T10:00:00.000Z', status: 'NDR', activity: 'Customer unavailable' }]
    });
    expect(mocks.shipment).toMatchObject({
      shipmentStatus: 'ndr',
      ndr: { attemptCount: 1, reason: 'Customer unavailable' }
    });
    await LogisticsWebhookService.process({ awb: 'NDR-AWB', current_status: 'RTO In Transit' });
    expect(mocks.shipment).toMatchObject({
      shipmentStatus: 'rto_in_transit',
      rto: { status: 'in_transit' }
    });
  });
});
