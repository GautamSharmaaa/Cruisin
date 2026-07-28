// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-package-test';
process.env.REDIS_URL = 'redis://localhost:6379/14';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.SHIPROCKET_ENABLED = 'true';
process.env.SHIPROCKET_MODE = 'mock';
process.env.SHIPROCKET_ALLOW_LIVE_READS = 'false';
process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS = 'false';
process.env.LOGISTICS_PACKAGING_WEIGHT_KG = '0.1';

import { PackagePresetModel } from '../../models/package-preset.model.js';
import { checkoutSchema } from '../../validators/order.validator.js';
import { packageConfirmationSchema } from '../../validators/logistics.validator.js';
import { calculatePackage } from './package-calculator.js';

describe('authoritative package calculation contract', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses product measurements, multiplies quantity and applies packaging weight', async () => {
    const parcel = await calculatePackage([{
      product: { title: 'Product', weight: 0.4, dimensions: { length: 20, width: 15, height: 3 }, packagingWeight: 0.05 },
      variant: { sku: 'PRODUCT-M' },
      quantity: 3
    }]);
    expect(parcel).toMatchObject({
      productWeightKg: 1.2,
      packagingWeightKg: 0.15,
      deadWeightKg: 1.35,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 9,
      measurementConfirmed: true
    });
  });

  it('uses variant overrides and combines multiple products and variants', async () => {
    const parcel = await calculatePackage([
      {
        product: { title: 'Jacket', weight: 0.8, dimensions: { length: 30, width: 20, height: 5 }, packagingWeight: 0.1 },
        variant: { sku: 'JACKET-L', weight: 1, dimensions: { length: 35, width: 24, height: 7 } },
        quantity: 1
      },
      {
        product: { title: 'Tee', weight: 0.2, dimensions: { length: 22, width: 16, height: 2 }, packagingWeight: 0.05 },
        variant: { sku: 'TEE-M' },
        quantity: 2
      }
    ]);
    expect(parcel).toMatchObject({
      productWeightKg: 1.4,
      packagingWeightKg: 0.2,
      deadWeightKg: 1.6,
      lengthCm: 35,
      breadthCm: 24,
      heightCm: 11,
      measurementConfirmed: true
    });
  });

  it('marks missing, zero and negative source measurements unconfirmed in mock mode', async () => {
    const parcel = await calculatePackage([{
      product: { title: 'Invalid legacy parcel', weight: 0, dimensions: { length: -1, width: 0 }, packagingWeight: -2 },
      variant: { sku: 'LEGACY-INVALID' },
      quantity: 1
    }]);
    expect(parcel).toMatchObject({
      productWeightKg: 0.25,
      packagingWeightKg: 0.1,
      deadWeightKg: 0.35,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 3,
      measurementConfirmed: false
    });
    expect(parcel.warnings).toEqual([expect.stringContaining('confirm before live shipping')]);
  });

  it('applies an active package preset and enforces its quantity limit', async () => {
    const lean = vi.fn().mockResolvedValue({
      name: 'QA Box',
      maximumQuantity: 2,
      lengthCm: 40,
      breadthCm: 30,
      heightCm: 12,
      packagingWeightKg: 0.4
    });
    vi.spyOn(PackagePresetModel, 'findOne').mockReturnValue({ lean } as never);
    const line = {
      product: { title: 'Preset product', weight: 0.2, dimensions: { length: 20, width: 15, height: 2 }, defaultPackagePreset: 'qa-box' },
      variant: { sku: 'PRESET-M' },
      quantity: 2
    };
    await expect(calculatePackage([line])).resolves.toMatchObject({
      packagePreset: 'qa-box',
      packagingWeightKg: 0.4,
      lengthCm: 40,
      breadthCm: 30,
      heightCm: 12
    });
    await expect(calculatePackage([{ ...line, quantity: 3 }])).rejects.toThrow('supports at most 2 items');
  });

  it('rejects oversized parcels and safely requires splitting above the configured maximum', async () => {
    await expect(calculatePackage([{
      product: { title: 'Oversized', weight: 101, dimensions: { length: 20, width: 15, height: 3 } },
      variant: { sku: 'OVERSIZED' },
      quantity: 1
    }])).rejects.toThrow('Package exceeds supported parcel limits and must be split');
    await expect(calculatePackage([{
      product: { title: 'Quantity limit', weight: 0.2, dimensions: { length: 20, width: 15, height: 3 }, maximumQuantityPerPackage: 2 },
      variant: { sku: 'LIMITED' },
      quantity: 3
    }])).rejects.toThrow('exceeds its maximum quantity per package');
  });

  it('validates admin-confirmed measurements and strips browser-authoritative logistics charges', () => {
    expect(packageConfirmationSchema.safeParse({
      productWeightKg: 1,
      packagingWeightKg: 0.2,
      deadWeightKg: 9,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 5,
      measurementConfirmed: true
    }).success).toBe(false);
    const checkout = checkoutSchema.parse({
      shippingAddress: { fullName: 'QA Customer', phone: '9000000001', line1: '1 Test Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
      billingAddress: { fullName: 'QA Customer', phone: '9000000001', line1: '1 Test Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      shippingMethod: 'standard',
      idempotencyKey: '00000000-0000-4000-8000-000000000099',
      shippingCharge: 0,
      codCharge: 0,
      weight: 0,
      length: 1,
      packageQuantity: 99
    });
    expect(checkout).not.toHaveProperty('shippingCharge');
    expect(checkout).not.toHaveProperty('codCharge');
    expect(checkout).not.toHaveProperty('weight');
    expect(checkout).not.toHaveProperty('length');
    expect(checkout).not.toHaveProperty('packageQuantity');
  });
});
