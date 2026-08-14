// Governed by .rules v1.0
import { beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';
process.env.SHIPROCKET_ENABLED = 'true';
process.env.SHIPROCKET_MODE = 'mock';
process.env.SHIPROCKET_ALLOW_LIVE_READS = 'false';
process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS = 'false';

let calculatePackage: typeof import('./package-calculator.js').calculatePackage;
let MockLogisticsProvider: typeof import('./mock-logistics-provider.js').MockLogisticsProvider;
let fixtures: typeof import('./mock-logistics-provider.js').mockLogisticsFixtures;
let normalizeShipmentStatus: typeof import('./logistics-status.js').normalizeShipmentStatus;
let canApplyShipmentStatus: typeof import('./logistics-status.js').canApplyShipmentStatus;
let applyShiprocketSnapshot: typeof import('./logistics-sync.service.js').applyShiprocketSnapshot;
let ShipmentModel: typeof import('../../models/shipment.model.js').ShipmentModel;
let OrderModel: typeof import('../../models/order.model.js').OrderModel;
let LogisticsNotificationService: typeof import('./logistics-notification.service.js').LogisticsNotificationService;
let LogisticsService: typeof import('./logistics.service.js').LogisticsService;
let LogisticsAuditModel: typeof import('../../models/logistics-audit.model.js').LogisticsAuditModel;

beforeAll(async () => {
  const [packageModule, mockModule, statusModule, syncModule, shipmentModule, orderModule, notificationModule, logisticsModule, auditModule] = await Promise.all([
    import('./package-calculator.js'),
    import('./mock-logistics-provider.js'),
    import('./logistics-status.js'),
    import('./logistics-sync.service.js'),
    import('../../models/shipment.model.js'),
    import('../../models/order.model.js'),
    import('./logistics-notification.service.js'),
    import('./logistics.service.js'),
    import('../../models/logistics-audit.model.js')
  ]);
  calculatePackage = packageModule.calculatePackage;
  MockLogisticsProvider = mockModule.MockLogisticsProvider;
  fixtures = mockModule.mockLogisticsFixtures;
  normalizeShipmentStatus = statusModule.normalizeShipmentStatus;
  canApplyShipmentStatus = statusModule.canApplyShipmentStatus;
  applyShiprocketSnapshot = syncModule.applyShiprocketSnapshot;
  ShipmentModel = shipmentModule.ShipmentModel;
  OrderModel = orderModule.OrderModel;
  LogisticsNotificationService = notificationModule.LogisticsNotificationService;
  LogisticsService = logisticsModule.LogisticsService;
  LogisticsAuditModel = auditModule.LogisticsAuditModel;
});

describe('package calculation', () => {
  it('uses variant measurements and includes packaging weight', async () => {
    const parcel = await calculatePackage([{
      product: { title: 'Jacket', weight: 0.8, dimensions: { length: 30, width: 20, height: 5 }, packagingWeight: 0.2, maximumQuantityPerPackage: 3 },
      variant: { sku: 'JKT-M', weight: 0.9, dimensions: { length: 32, width: 22, height: 6 } },
      quantity: 2
    }]);
    expect(parcel).toMatchObject({ productWeightKg: 1.8, packagingWeightKg: 0.4, deadWeightKg: 2.2, lengthCm: 32, breadthCm: 22, heightCm: 12, measurementConfirmed: true });
  });

  it('uses the editable catalog defaults when measurements are absent', async () => {
    const parcel = await calculatePackage([{ product: { title: 'Legacy Tee' }, variant: { sku: 'LEGACY-M' }, quantity: 1 }]);
    expect(parcel).toMatchObject({ productWeightKg: 0.27, lengthCm: 30.48, breadthCm: 25.4, heightCm: 2, measurementConfirmed: true });
    expect(parcel.warnings[0]).toContain('Default shipping measurements');
  });

  it('rejects quantities above the per-package limit', async () => {
    await expect(calculatePackage([{ product: { title: 'Tee', weight: 0.2, dimensions: { length: 20, width: 15, height: 2 }, maximumQuantityPerPackage: 2 }, variant: { sku: 'TEE' }, quantity: 3 }])).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('mock provider and status normalization', () => {
  it('returns normalized standard and express rates without network access', async () => {
    const provider = new MockLogisticsProvider();
    const result = await provider.getRates({ pickupPostcode: '560001', deliveryPostcode: fixtures.prepaidAndCodPincode, paymentMode: 'cod', weightKg: 1, lengthCm: 20, breadthCm: 15, heightCm: 5, declaredValue: 2_000 });
    expect(result.serviceable).toBe(true);
    expect(result.couriers.map((courier) => courier.shippingMode)).toEqual(['surface', 'air']);
    expect(result.couriers.every((courier) => courier.codCharge > 0)).toBe(true);
  });

  it('models non-serviceable and NDR/RTO fixtures', async () => {
    const provider = new MockLogisticsProvider();
    const unavailable = await provider.getRates({ pickupPostcode: '560001', deliveryPostcode: fixtures.nonServiceablePincode, paymentMode: 'prepaid', weightKg: 1, lengthCm: 20, breadthCm: 15, heightCm: 5, declaredValue: 2_000 });
    expect(unavailable.serviceable).toBe(false);
    expect((await provider.trackShipment({ awb: 'MOCK-NDR' })).status).toBe('ndr');
    expect((await provider.trackShipment({ awb: 'MOCK-RTO' })).status).toBe('rto_in_transit');
  });

  it('exposes prepaid-only serviceability without enabling COD', async () => {
    const provider = new MockLogisticsProvider();
    const prepaid = await provider.getRates({ pickupPostcode: '560001', deliveryPostcode: fixtures.prepaidOnlyPincode, paymentMode: 'prepaid', weightKg: 1, lengthCm: 20, breadthCm: 15, heightCm: 5, declaredValue: 2_000 });
    const cod = await provider.getRates({ pickupPostcode: '560001', deliveryPostcode: fixtures.prepaidOnlyPincode, paymentMode: 'cod', weightKg: 1, lengthCm: 20, breadthCm: 15, heightCm: 5, declaredValue: 2_000 });
    expect(prepaid.serviceable).toBe(true);
    expect(cod).toMatchObject({ serviceable: false, couriers: [] });
  });

  it('normalizes temporary provider outages as retryable errors', async () => {
    const provider = new MockLogisticsProvider();
    await expect(provider.getRates({ pickupPostcode: '560001', deliveryPostcode: fixtures.outagePincode, paymentMode: 'prepaid', weightKg: 1, lengthCm: 20, breadthCm: 15, heightCm: 5, declaredValue: 2_000 })).rejects.toMatchObject({
      code: 'temporary_provider',
      retryable: true,
      statusCode: 503
    });
  });

  it('recovers from the deterministic one-shot order outage without creating a duplicate provider order', async () => {
    const provider = new MockLogisticsProvider();
    const input = {
      localOrderId: 'local-outage-once',
      sourceOrderId: 'CR-OUTAGE-ONCE',
      orderDate: new Date('2026-07-28T00:00:00.000Z'),
      pickupLocation: 'Mock Warehouse',
      address: { name: 'QA', phone: '+919876543210', address: 'Test', city: 'Bengaluru', state: 'Karnataka', country: 'India', postcode: '560001' },
      items: [{ name: 'QA Tee', sku: 'QA-TEE', units: 1, sellingPrice: 1000, discount: 0, tax: 0 }],
      paymentMode: 'prepaid' as const,
      subtotal: 1000,
      shippingCharge: 92,
      totalDiscount: 0,
      total: 1092,
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] }
    };
    await expect(provider.createOrder(input)).rejects.toMatchObject({ retryable: true });
    const created = await provider.createOrder(input);
    expect(created.providerOrderId).toMatch(/^MO-/);
    await expect(provider.createOrder(input)).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('blocks terminal downgrades and preserves exception transitions', () => {
    expect(normalizeShipmentStatus('Out For Delivery')).toBe('out_for_delivery');
    expect(canApplyShipmentStatus('delivered', 'in_transit')).toBe(false);
    expect(canApplyShipmentStatus('in_transit', 'ndr')).toBe(true);
  });

  it.each([
    ['Pickup Queued', undefined, 'pickup_scheduled'],
    ['Out for Pickup', 19, 'out_for_pickup'],
    ['Picked Up', 42, 'picked_up'],
    ['Delayed', 13, 'delivery_exception'],
    ['RTO In Transit', 46, 'rto_in_transit'],
    ['Untraceable', 76, 'lost'],
    ['Destroyed', 25, 'damaged'],
    ['provider wording unavailable', 17, 'out_for_delivery']
  ])('maps Shiprocket status %s / %s to %s', (raw, statusId, expected) => {
    expect(normalizeShipmentStatus(raw, statusId)).toBe(expected);
  });

  it('deduplicates synchronized scans and refuses a terminal status downgrade', async () => {
    const shipment = new ShipmentModel({
      order: '66b000000000000000000001',
      sourceOrderId: 'CR-SYNC-UNIT',
      providerOrderId: '1001',
      providerShipmentId: '2001',
      pickupLocation: 'QA Warehouse',
      shipmentStatus: 'delivered',
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
      idempotencyKey: 'forward:sync-unit'
    });
    vi.spyOn(shipment, 'save').mockResolvedValue(shipment);
    const orderUpdate = vi.spyOn(OrderModel, 'updateOne').mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 0, upsertedCount: 0, upsertedId: null });
    const notify = vi.spyOn(LogisticsNotificationService, 'emit').mockResolvedValue({} as never);
    const snapshot = {
      providerOrderId: '1001',
      providerShipmentId: '2001',
      awb: 'AWB-SYNC-UNIT',
      status: 'in_transit' as const,
      rawStatus: 'In Transit',
      scans: [{ status: 'in_transit' as const, rawStatus: 'In Transit', message: 'Parcel moving', location: 'Bengaluru', timestamp: '2026-08-11T08:00:00.000Z' }]
    };
    const first = await applyShiprocketSnapshot(shipment, snapshot, 'manual_sync');
    const second = await applyShiprocketSnapshot(shipment, snapshot, 'manual_sync');
    expect(shipment.shipmentStatus).toBe('delivered');
    expect(first.scansAdded).toBe(1);
    expect(second.scansAdded).toBe(0);
    expect(second.changed).toBe(false);
    expect(shipment.trackingScans).toHaveLength(1);
    expect(orderUpdate).toHaveBeenCalledTimes(2);
    expect(orderUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ _id: shipment.order }),
      { $set: { fulfillmentStatus: 'fulfilled', orderStatus: 'delivered' } }
    );
    expect(notify).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it.each([
    ['order ID', { providerOrderId: 'conflicting-order', providerShipmentId: '2005', awb: 'AWB-INTEGRITY' }],
    ['shipment ID', { providerOrderId: '1005', providerShipmentId: 'conflicting-shipment', awb: 'AWB-INTEGRITY' }],
    ['AWB', { providerOrderId: '1005', providerShipmentId: '2005', awb: 'conflicting-awb' }]
  ])('fails closed when Shiprocket returns a conflicting %s', async (_label, identifiers) => {
    const shipment = new ShipmentModel({
      order: '66b000000000000000000001',
      shipmentType: 'forward',
      sourceOrderId: 'CR-SYNC-INTEGRITY',
      providerOrderId: '1005',
      providerShipmentId: '2005',
      awb: 'AWB-INTEGRITY',
      pickupLocation: 'QA Warehouse',
      shipmentStatus: 'in_transit',
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
      idempotencyKey: 'forward:sync-integrity'
    });
    const save = vi.spyOn(shipment, 'save').mockResolvedValue(shipment);

    await expect(applyShiprocketSnapshot(shipment, {
      ...identifiers,
      status: 'in_transit',
      rawStatus: 'In Transit',
      scans: []
    }, 'manual_sync')).rejects.toMatchObject({ code: 'invalid_payload', retryable: false, statusCode: 409 });
    expect(save).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('applies provider-confirmed cost, mode and charged-weight values during synchronization', async () => {
    const shipment = new ShipmentModel({
      order: '66b000000000000000000001',
      sourceOrderId: 'CR-SYNC-COSTS',
      providerOrderId: '1002',
      providerShipmentId: '2002',
      pickupLocation: 'QA Warehouse',
      shipmentStatus: 'in_transit',
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
      idempotencyKey: 'forward:sync-costs'
    });
    vi.spyOn(shipment, 'save').mockResolvedValue(shipment);
    const orderUpdate = vi.spyOn(OrderModel, 'updateOne').mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 0, upsertedCount: 0, upsertedId: null });
    const result = await applyShiprocketSnapshot(shipment, {
      providerOrderId: '1002',
      providerShipmentId: '2002',
      status: 'in_transit',
      rawStatus: 'In Transit',
      scans: [],
      shippingMode: 'surface',
      providerShippingCost: 82,
      codCharge: 18,
      otherProviderCharges: 4,
      rtoCost: 0,
      chargedWeightKg: 0.75
    }, 'manual_sync');
    expect(result.changed).toBe(true);
    expect(shipment).toMatchObject({ shippingMode: 'surface', providerShippingCost: 82, codCharge: 18, otherProviderCharges: 4, rtoCost: 0 });
    expect(shipment.package?.chargedWeightKg).toBe(0.75);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: shipment.order }),
      { $set: { fulfillmentStatus: 'partially_fulfilled', orderStatus: 'shipped' } }
    );
    vi.restoreAllMocks();
  });

  it('updates the commerce order only from forward-shipment status changes', async () => {
    const orderUpdate = vi.spyOn(OrderModel, 'updateOne').mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null });
    const forward = new ShipmentModel({
      order: '66b000000000000000000001',
      shipmentType: 'forward',
      sourceOrderId: 'CR-FORWARD-CANCEL',
      providerOrderId: '1003',
      providerShipmentId: '2003',
      pickupLocation: 'QA Warehouse',
      shipmentStatus: 'in_transit',
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
      idempotencyKey: 'forward:cancel-sync'
    });
    const reverse = new ShipmentModel({
      order: '66b000000000000000000001',
      shipmentType: 'return',
      sourceOrderId: 'CR-RETURN-CANCEL',
      providerOrderId: '1004',
      providerShipmentId: '2004',
      pickupLocation: 'QA Warehouse',
      shipmentStatus: 'in_transit',
      package: { productWeightKg: 0.4, packagingWeightKg: 0.1, deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
      idempotencyKey: 'return:cancel-sync'
    });
    vi.spyOn(forward, 'save').mockResolvedValue(forward);
    vi.spyOn(reverse, 'save').mockResolvedValue(reverse);
    const cancelled = { status: 'cancelled' as const, rawStatus: 'Cancelled', scans: [] };

    await applyShiprocketSnapshot(forward, cancelled, 'manual_sync');
    await applyShiprocketSnapshot(reverse, cancelled, 'manual_sync');

    expect(orderUpdate).toHaveBeenCalledTimes(1);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: forward.order }),
      { $set: { fulfillmentStatus: 'cancelled', orderStatus: 'cancelled' } }
    );
    vi.restoreAllMocks();
  });

  it('bulk-syncs only bounded active Shiprocket shipments and summarizes partial failures', async () => {
    const lean = vi.fn().mockResolvedValue([{ _id: '66b000000000000000000011' }, { _id: '66b000000000000000000012' }]);
    const select = vi.fn(() => ({ lean }));
    const limit = vi.fn(() => ({ select }));
    const sort = vi.fn(() => ({ limit }));
    const find = vi.spyOn(ShipmentModel, 'find').mockReturnValue({ sort } as never);
    const reconcile = vi.spyOn(LogisticsService, 'reconcileShiprocketShipment')
      .mockResolvedValueOnce({ changed: true })
      .mockRejectedValueOnce(new Error('provider unavailable'));
    vi.spyOn(LogisticsAuditModel, 'create').mockResolvedValue({} as never);

    const summary = await LogisticsService.reconcileActiveShiprocketShipments({ limit: 500, concurrency: 20, adminId: '66b000000000000000000001' });

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ provider: 'shiprocket', shipmentStatus: { $in: expect.any(Array) } }));
    expect(limit).toHaveBeenCalledWith(100);
    expect(reconcile).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ scanned: 2, changed: 1, unchanged: 0, failed: 1, shiprocketMutations: 0 });
    vi.restoreAllMocks();
  });
});
