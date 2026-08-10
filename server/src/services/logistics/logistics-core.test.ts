// Governed by .rules v1.0
import { beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-test';
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

beforeAll(async () => {
  const [packageModule, mockModule, statusModule] = await Promise.all([
    import('./package-calculator.js'),
    import('./mock-logistics-provider.js'),
    import('./logistics-status.js')
  ]);
  calculatePackage = packageModule.calculatePackage;
  MockLogisticsProvider = mockModule.MockLogisticsProvider;
  fixtures = mockModule.mockLogisticsFixtures;
  normalizeShipmentStatus = statusModule.normalizeShipmentStatus;
  canApplyShipmentStatus = statusModule.canApplyShipmentStatus;
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
    expect(parcel).toMatchObject({ productWeightKg: 0.2, lengthCm: 30.48, breadthCm: 25.4, heightCm: 2, measurementConfirmed: true });
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
});
