// Governed by .rules v1.0
import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateLogisticsOrderInput } from '../../types/logistics.types.js';
import { MockLogisticsProvider, mockLogisticsFixtures } from './mock-logistics-provider.js';

const orderInput = (sourceOrderId: string): CreateLogisticsOrderInput => ({
  localOrderId: `local-${sourceOrderId}`,
  sourceOrderId,
  orderDate: new Date('2026-07-28T00:00:00.000Z'),
  pickupLocation: 'Mock Warehouse',
  address: {
    name: 'QA Customer',
    phone: '+919000000001',
    address: '1 Example Test Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postcode: '560001'
  },
  items: [{ name: 'QA Tee', sku: 'QA-TEE', units: 1, sellingPrice: 1_000, discount: 0, tax: 0 }],
  paymentMode: 'prepaid',
  subtotal: 1_000,
  shippingCharge: 92,
  totalDiscount: 0,
  total: 1_092,
  package: {
    productWeightKg: 0.4,
    packagingWeightKg: 0.1,
    deadWeightKg: 0.5,
    lengthCm: 20,
    breadthCm: 15,
    heightCm: 5,
    measurementConfirmed: true,
    warnings: []
  }
});

describe('complete mock logistics provider contract', () => {
  let provider: MockLogisticsProvider;

  beforeEach(() => {
    provider = new MockLogisticsProvider();
  });

  it('authenticates and validates the configured pickup without external work', async () => {
    await expect(provider.authenticate()).resolves.toBeUndefined();
    await expect(provider.validatePickupLocation('Mock Warehouse', '560001')).resolves.toBeUndefined();
  });

  it('returns provider-neutral prepaid/COD standard and express options', async () => {
    const prepaid = await provider.checkServiceability({
      pickupPostcode: '560001',
      deliveryPostcode: mockLogisticsFixtures.prepaidAndCodPincode,
      paymentMode: 'prepaid',
      weightKg: 0.5,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 5,
      declaredValue: 1_000
    });
    const cod = await provider.getRates({
      pickupPostcode: '560001',
      deliveryPostcode: mockLogisticsFixtures.prepaidAndCodPincode,
      paymentMode: 'cod',
      weightKg: 0.5,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 5,
      declaredValue: 1_000
    });
    expect(prepaid).toMatchObject({ serviceable: true, codAvailable: true });
    expect(prepaid.couriers.map((courier) => courier.shippingMode)).toEqual(['surface', 'air']);
    expect(cod.couriers.every((courier) => courier.codCharge > 0 && courier.totalCharge > courier.freightCharge)).toBe(true);
  });

  it.each([
    [mockLogisticsFixtures.timeoutPincode, 'timeout', 504],
    [mockLogisticsFixtures.rateLimitedPincode, 'rate_limited', 503],
    [mockLogisticsFixtures.outagePincode, 'temporary_provider', 503]
  ])('normalizes fixture failure for postcode %s', async (deliveryPostcode, code, statusCode) => {
    await expect(provider.getRates({
      pickupPostcode: '560001',
      deliveryPostcode,
      paymentMode: 'prepaid',
      weightKg: 0.5,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 5,
      declaredValue: 1_000
    })).rejects.toMatchObject({ code, statusCode, retryable: true });
  });

  it('creates one provider order and rejects both malformed and duplicate requests safely', async () => {
    const created = await provider.createOrder(orderInput('CR-QA-CONTRACT'));
    expect(created).toMatchObject({ status: 'NEW' });
    expect(created.providerOrderId).toMatch(/^MO-/);
    expect(created.providerShipmentId).toMatch(/^MS-/);
    await expect(provider.createOrder(orderInput('CR-QA-CONTRACT'))).rejects.toMatchObject({ code: 'duplicate', retryable: false });
    await expect(provider.createOrder(orderInput('CR-QA-MALFORMED'))).rejects.toMatchObject({ code: 'permanent_provider', retryable: false });
  });

  it('assigns one AWB idempotently and schedules pickup only for accepted fixtures', async () => {
    const first = await provider.assignCourier({ providerShipmentId: 'MS-QA', courierId: 235 });
    const duplicate = await provider.assignCourier({ providerShipmentId: 'MS-QA', courierId: 10 });
    expect(duplicate).toEqual(first);
    expect(first).toMatchObject({ courierId: 235, courierName: 'Mock Express', status: 'AWB Assigned' });
    await expect(provider.schedulePickup({ providerShipmentId: 'MS-QA' })).resolves.toMatchObject({ pickupScheduled: true, status: 'Pickup Scheduled' });
    await expect(provider.schedulePickup({ providerShipmentId: 'MS-REJECT' })).rejects.toMatchObject({ retryable: false, code: 'permanent_provider' });
  });

  it('generates normalized label, invoice and manifest references', async () => {
    const [label, invoice, manifest] = await Promise.all([
      provider.generateLabel({ providerShipmentId: 'MS-QA' }),
      provider.generateInvoice({ providerOrderId: 'MO-QA' }),
      provider.generateManifest({ providerShipmentId: 'MS-QA' })
    ]);
    expect(label.url).toBe('mock://logistics/label/MS-QA.pdf');
    expect(invoice.url).toBe('mock://logistics/invoice/MO-QA.pdf');
    expect(manifest.url).toBe('mock://logistics/manifest/MS-QA.pdf');
    expect([label, invoice, manifest].every((document) => !Number.isNaN(Date.parse(document.generatedAt)))).toBe(true);
  });

  it.each([
    ['MOCK-TRACK', 'in_transit'],
    ['MOCK-DELIVERED', 'delivered'],
    ['MOCK-NDR', 'ndr'],
    ['MOCK-RTO', 'rto_in_transit'],
    ['MOCK-RTODELIVERED', 'rto_delivered']
  ])('normalizes tracking scenario %s', async (awb, status) => {
    const tracking = await provider.trackShipment({ awb });
    expect(tracking.status).toBe(status);
    expect(tracking.scans).toHaveLength(2);
    expect(Date.parse(tracking.scans[0].timestamp)).toBeLessThanOrEqual(Date.parse(tracking.scans[1].timestamp));
  });

  it('cancels eligible shipments, refuses delivered cancellation and exposes cancelled tracking', async () => {
    await expect(provider.cancelShipment({ awb: 'MOCK-CANCEL' })).resolves.toEqual({ cancelled: true, status: 'Cancelled' });
    await expect(provider.trackShipment({ awb: 'MOCK-CANCEL' })).resolves.toMatchObject({ status: 'cancelled', scans: [] });
    await expect(provider.cancelShipment({ awb: 'MOCK-DELIVERED' })).rejects.toMatchObject({ code: 'permanent_provider', retryable: false });
  });

  it('creates distinct return and exchange-replacement shipments without duplication', async () => {
    const returned = await provider.createReturn({ ...orderInput('CR-QA-RETURN'), returnReason: 'QA return' });
    const replacement = await provider.createOrder({ ...orderInput('CR-QA-EXCHANGE'), sourceOrderId: 'EXCHANGE-CR-QA-EXCHANGE' });
    expect(returned.awb).toMatch(/^MOCKRETURN/);
    expect(returned.providerShipmentId).not.toBe(replacement.providerShipmentId);
    await expect(provider.createReturn({ ...orderInput('CR-QA-RETURN'), returnReason: 'QA return' })).rejects.toMatchObject({ code: 'duplicate' });
  });
});
