// Governed by .rules v1.0
import { Types } from 'mongoose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-quote-test';
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

const userId = new Types.ObjectId().toString();
const productId = new Types.ObjectId();
const variantId = new Types.ObjectId();
const quoteId = '00000000-0000-4000-8000-000000000123';
const cart = { items: [{ product: productId, variant: variantId, quantity: 1 }] };
const product = {
  _id: productId,
  title: 'QA Tee',
  status: 'published',
  visibility: 'visible',
  isActive: true,
  isArchived: false,
  weight: 0.4,
  dimensions: { length: 20, width: 15, height: 3 },
  packagingWeight: 0.1,
  maximumQuantityPerPackage: 4,
  variants: [{
    _id: variantId,
    sku: 'QA-TEE-M',
    price: 1_000,
    stock: 5,
    enabled: true
  }]
};

let LogisticsQuoteService: typeof import('./logistics-quote.service.js').LogisticsQuoteService;
let fingerprint: typeof import('./logistics-quote.service.js').cartFingerprint;
let LogisticsQuoteModel: typeof import('../../models/logistics-quote.model.js').LogisticsQuoteModel;
let CartModel: typeof import('../../models/cart.model.js').CartModel;
let ProductModel: typeof import('../../models/product.model.js').ProductModel;
let logisticsQuoteSchema: typeof import('../../validators/logistics.validator.js').logisticsQuoteSchema;

const packageLine = (source = product) => ({
  product: source,
  variant: source.variants[0],
  quantity: 1
});
const expectedFingerprint = (source = product): string => fingerprint([{
  productId: productId.toString(),
  variantId: variantId.toString(),
  quantity: 1,
  price: source.variants[0].price,
  packageLine: packageLine(source)
}]);
const quote = (overrides: Record<string, unknown> = {}) => ({
  quoteId,
  user: userId,
  cartFingerprint: expectedFingerprint(),
  paymentMode: 'prepaid',
  deliveryPostcode: '560001',
  expiresAt: new Date(Date.now() + 60_000),
  consumedAt: undefined,
  package: { deadWeightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 3, measurementConfirmed: true, warnings: [] },
  options: [{
    code: 'standard',
    shippingCharge: 92,
    providerCost: 80,
    codCharge: 0,
    courierId: 10,
    courierName: 'Mock Surface',
    shippingMode: 'surface',
    codAvailable: true
  }],
  ...overrides
});

beforeAll(async () => {
  const [serviceModule, quoteModelModule, cartModelModule, productModelModule, validatorModule] = await Promise.all([
    import('./logistics-quote.service.js'),
    import('../../models/logistics-quote.model.js'),
    import('../../models/cart.model.js'),
    import('../../models/product.model.js'),
    import('../../validators/logistics.validator.js')
  ]);
  LogisticsQuoteService = serviceModule.LogisticsQuoteService;
  fingerprint = serviceModule.cartFingerprint;
  LogisticsQuoteModel = quoteModelModule.LogisticsQuoteModel;
  CartModel = cartModelModule.CartModel;
  ProductModel = productModelModule.ProductModel;
  logisticsQuoteSchema = validatorModule.logisticsQuoteSchema;
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(CartModel, 'findOne').mockReturnValue({ lean: vi.fn().mockResolvedValue(cart) } as never);
  vi.spyOn(ProductModel, 'find').mockReturnValue({ lean: vi.fn().mockResolvedValue([product]) } as never);
  vi.spyOn(LogisticsQuoteModel, 'findOne').mockResolvedValue(quote() as never);
});

describe('logistics quote ownership, freshness and authoritative pricing', () => {
  it('accepts only six-digit Indian pincodes', () => {
    expect(logisticsQuoteSchema.safeParse({ deliveryPostcode: '560001', paymentMode: 'prepaid' }).success).toBe(true);
    for (const invalid of ['56000', '5600001', '56A001', '560-01', '000000']) {
      expect(logisticsQuoteSchema.safeParse({ deliveryPostcode: invalid, paymentMode: 'prepaid' }).success).toBe(false);
    }
  });

  it('binds the fingerprint to current price, weight, dimensions, packaging and quantity', () => {
    const baseline = expectedFingerprint();
    expect(expectedFingerprint({ ...product, weight: 0.5 })).not.toBe(baseline);
    expect(expectedFingerprint({ ...product, dimensions: { ...product.dimensions, height: 4 } })).not.toBe(baseline);
    expect(expectedFingerprint({ ...product, packagingWeight: 0.2 })).not.toBe(baseline);
    expect(fingerprint([{
      productId: productId.toString(),
      variantId: variantId.toString(),
      quantity: 2,
      price: 1_000,
      packageLine: { ...packageLine(), quantity: 2 }
    }])).not.toBe(baseline);
  });

  it('returns only the stored courier option and server-controlled shipping charge', async () => {
    await expect(LogisticsQuoteService.validate(userId, {
      quoteId,
      shippingMethod: 'standard',
      paymentMode: 'prepaid',
      deliveryPostcode: '560001'
    })).resolves.toMatchObject({
      quoteId,
      shippingMethod: 'standard',
      shippingCharge: 0,
      option: { courierId: 10, courierName: 'Mock Surface', providerCost: 80 }
    });
    expect(LogisticsQuoteModel.findOne).toHaveBeenCalledWith({ quoteId, user: userId });
  });

  it('keeps the provider cost while making the customer shipping charge free', async () => {
    await expect(LogisticsQuoteService.validate(userId, {
      quoteId,
      shippingMethod: 'standard',
      paymentMode: 'prepaid',
      deliveryPostcode: '560001',
      freeShipping: true
    })).resolves.toMatchObject({
      shippingCharge: 0,
      option: { providerCost: 80, codCharge: 0, courierId: 10 }
    });
  });

  it('rejects missing, foreign, expired, consumed and address/payment-mismatched quotes', async () => {
    vi.mocked(LogisticsQuoteModel.findOne).mockResolvedValueOnce(null);
    await expect(LogisticsQuoteService.validate('another-user', {
      quoteId,
      shippingMethod: 'standard',
      paymentMode: 'prepaid',
      deliveryPostcode: '560001'
    })).rejects.toThrow('Delivery quote is invalid');
    for (const [override, input, message] of [
      [{ expiresAt: new Date(Date.now() - 1) }, { paymentMode: 'prepaid', deliveryPostcode: '560001' }, 'Delivery quote expired'],
      [{ consumedAt: new Date() }, { paymentMode: 'prepaid', deliveryPostcode: '560001' }, 'already used'],
      [{}, { paymentMode: 'cod', deliveryPostcode: '560001' }, 'Delivery details changed'],
      [{}, { paymentMode: 'prepaid', deliveryPostcode: '110001' }, 'Delivery details changed']
    ] as const) {
      vi.mocked(LogisticsQuoteModel.findOne).mockResolvedValueOnce(quote(override) as never);
      await expect(LogisticsQuoteService.validate(userId, {
        quoteId,
        shippingMethod: 'standard',
        paymentMode: input.paymentMode,
        deliveryPostcode: input.deliveryPostcode
      })).rejects.toThrow(message);
    }
  });

  it('invalidates the quote when catalog price, parcel data, product availability or stock changes', async () => {
    for (const changedProduct of [
      { ...product, variants: [{ ...product.variants[0], price: 1_100 }] },
      { ...product, weight: 0.5 },
      { ...product, variants: [{ ...product.variants[0], stock: 0 }] }
    ]) {
      vi.mocked(ProductModel.find).mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([changedProduct]) } as never);
      await expect(LogisticsQuoteService.validate(userId, {
        quoteId,
        shippingMethod: 'standard',
        paymentMode: 'prepaid',
        deliveryPostcode: '560001'
      })).rejects.toThrow();
    }
    vi.mocked(ProductModel.find).mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) } as never);
    await expect(LogisticsQuoteService.validate(userId, {
      quoteId,
      shippingMethod: 'standard',
      paymentMode: 'prepaid',
      deliveryPostcode: '560001'
    })).rejects.toThrow('no longer available');
  });

  it('rejects a manipulated option code and a COD option that the provider did not approve', async () => {
    await expect(LogisticsQuoteService.validate(userId, {
      quoteId,
      shippingMethod: 'express',
      paymentMode: 'prepaid',
      deliveryPostcode: '560001'
    })).rejects.toThrow('Selected delivery option is no longer available');
    vi.mocked(LogisticsQuoteModel.findOne).mockResolvedValueOnce(quote({
      paymentMode: 'cod',
      options: [{ ...quote().options[0], codAvailable: false }]
    }) as never);
    await expect(LogisticsQuoteService.validate(userId, {
      quoteId,
      shippingMethod: 'standard',
      paymentMode: 'cod',
      deliveryPostcode: '560001'
    })).rejects.toThrow('Selected delivery option is no longer available');
  });
});
