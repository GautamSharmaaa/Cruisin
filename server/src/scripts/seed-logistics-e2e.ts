// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';
import mongoose, { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { CartModel } from '../models/cart.model.js';
import { CategoryModel } from '../models/category.model.js';
import { applicationModels } from '../models/model-registry.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { UserModel } from '../models/user.model.js';

const expectedDatabase = 'cruisin-sync-order-analytics-tests';
const fixtureIds = {
  category: '66b000000000000000000001',
  product: '66b000000000000000000101',
  variantA: '66b000000000000000000111',
  variantB: '66b000000000000000000112',
  admin: '66b000000000000000000201',
  customer: '66b000000000000000000202',
  outageOrder: '66b000000000000000000301',
  ndrOrder: '66b000000000000000000302',
  rtoOrder: '66b000000000000000000303',
  returnOrder: '66b000000000000000000304',
  exchangeOrder: '66b000000000000000000305',
  safeDeleteOrder: '66b000000000000000000306',
  ndrShipment: '66b000000000000000000402',
  rtoShipment: '66b000000000000000000403',
  returnShipment: '66b000000000000000000404',
  exchangeShipment: '66b000000000000000000405'
} as const;

const objectId = (value: string): Types.ObjectId => new Types.ObjectId(value);
const assertIsolatedTarget = (): void => {
  if (process.env.LOGISTICS_E2E_SEED !== 'true') throw new Error('Set LOGISTICS_E2E_SEED=true to seed the isolated logistics E2E database');
  if (process.env.SHIPROCKET_MODE !== 'mock') throw new Error('Logistics E2E seeding requires SHIPROCKET_MODE=mock');
  if (process.env.SHIPROCKET_ALLOW_LIVE_READS === 'true' || process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS === 'true') {
    throw new Error('Logistics E2E seeding refuses live Shiprocket access');
  }
  const uri = process.env.MONGODB_URI ?? '';
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI must be a valid local MongoDB URL');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (parsed.protocol !== 'mongodb:' || !['localhost', '127.0.0.1'].includes(parsed.hostname) || database !== expectedDatabase) {
    throw new Error(`Logistics E2E seeding only permits mongodb://localhost/.../${expectedDatabase}`);
  }
  const redisUri = process.env.REDIS_URL ?? '';
  let parsedRedis: URL;
  try {
    parsedRedis = new URL(redisUri);
  } catch {
    throw new Error('REDIS_URL must be a valid local Redis URL');
  }
  if (parsedRedis.protocol !== 'redis:' || !['localhost', '127.0.0.1'].includes(parsedRedis.hostname) || parsedRedis.pathname !== '/15') {
    throw new Error('Logistics E2E seeding only permits isolated local Redis database 15');
  }
};

const address = {
  fullName: 'Logistics E2E Customer',
  phone: '9000000002',
  line1: '1 Test Warehouse Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'India'
};
const item = (variant: 'a' | 'b' = 'a', quantity = 1) => ({
  product: objectId(fixtureIds.product),
  variant: objectId(variant === 'a' ? fixtureIds.variantA : fixtureIds.variantB),
  title: 'Logistics E2E Tee',
  sku: variant === 'a' ? 'CR-E2E-BLK-M' : 'CR-E2E-BLK-L',
  size: variant === 'a' ? 'M' : 'L',
  color: 'Black',
  quantity,
  price: variant === 'a' ? 1_200 : 1_300,
  image: 'https://example.invalid/e2e-product.jpg'
});
const paidOrder = (id: string, orderNumber: string, variant: 'a' | 'b' = 'a', quantity = 1) => ({
  _id: objectId(id),
  user: objectId(fixtureIds.customer),
  items: [item(variant, quantity)],
  shippingAddress: address,
  billingAddress: address,
  orderNumber,
  paymentMethod: 'razorpay',
  paymentMode: 'online',
  paymentProvider: 'razorpay',
  paymentStatus: 'paid',
  orderStatus: 'confirmed',
  fulfillmentStatus: 'fulfilled',
  subtotal: (variant === 'a' ? 1_200 : 1_300) * quantity,
  tax: 0,
  shipping: 92,
  discount: 0,
  codFee: 0,
  total: (variant === 'a' ? 1_200 : 1_300) * quantity + 92,
  amountPaid: (variant === 'a' ? 1_200 : 1_300) * quantity + 92,
  amountDue: 0,
  stockReserved: false,
  razorpayPaymentId: `pay_${orderNumber.toLowerCase()}`,
  timeline: [{ status: 'paid', timestamp: new Date(), note: 'Seeded paid logistics E2E order' }]
});
const parcel = {
  productWeightKg: 0.4,
  packagingWeightKg: 0.1,
  deadWeightKg: 0.5,
  chargedWeightKg: 0.5,
  lengthCm: 20,
  breadthCm: 15,
  heightCm: 5,
  measurementConfirmed: true,
  warnings: []
};
const forwardShipment = (id: string, orderId: string, sourceOrderId: string, awb: string, status: 'awb_assigned' | 'delivered') => ({
  _id: objectId(id),
  order: objectId(orderId),
  shipmentType: 'forward',
  provider: 'shiprocket',
  sourceOrderId,
  providerOrderId: `MO-${id.slice(-6)}`,
  providerShipmentId: `MS-${id.slice(-6)}`,
  awb,
  courierId: 10,
  courierName: 'Mock Surface',
  shippingMode: 'surface',
  shipmentStatus: status,
  rawProviderStatus: status === 'delivered' ? 'Delivered' : 'AWB Assigned',
  pickupLocation: 'Mock Warehouse',
  package: parcel,
  deliveredDate: status === 'delivered' ? new Date(Date.now() - 86_400_000) : undefined,
  idempotencyKey: `forward:${orderId}`
});

const seed = async (): Promise<void> => {
  assertIsolatedTarget();
  const isolatedRedis = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await isolatedRedis.connect();
  await isolatedRedis.flushdb();
  await isolatedRedis.quit();
  await connectDb();
  try {
    if (mongoose.connection.name !== expectedDatabase) {
      throw new Error(`Connected to unexpected database ${mongoose.connection.name}`);
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(applicationModels.map(async (model) => model.createIndexes()));
    const passwordHash = await bcrypt.hash('LogisticsE2E123!', 10);
    await UserModel.create([
      {
        _id: objectId(fixtureIds.admin),
        name: 'Logistics E2E Admin',
        email: 'logistics-admin@example.test',
        passwordHash,
        role: 'superadmin',
        status: 'active',
        isVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true
      },
      {
        _id: objectId(fixtureIds.customer),
        name: 'Logistics E2E Customer',
        email: 'logistics-customer@example.test',
        passwordHash,
        role: 'customer',
        status: 'active',
        phone: '9000000002',
        whatsappNumber: '9000000003',
        isVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        whatsappVerifiedAt: new Date(),
        isActive: true
      }
    ]);
    await CategoryModel.create({
      _id: objectId(fixtureIds.category),
      name: 'Logistics E2E',
      slug: 'logistics-e2e',
      path: 'logistics-e2e',
      image: 'https://example.invalid/e2e-category.jpg',
      isActive: true,
      isVisible: true,
      isPublished: true
    });
    await ProductModel.create({
      _id: objectId(fixtureIds.product),
      title: 'Logistics E2E Tee',
      slug: 'logistics-e2e-tee',
      description: 'A deterministic product used only by the isolated logistics test matrix.',
      richDescription: 'A deterministic product used only by the isolated logistics test matrix.',
      brand: 'Cruisin',
      category: objectId(fixtureIds.category),
      categoryIds: [objectId(fixtureIds.category)],
      images: [{ url: 'https://example.invalid/e2e-product.jpg', alt: 'Logistics E2E Tee', width: 800, height: 1000 }],
      basePrice: 1_200,
      status: 'published',
      visibility: 'visible',
      isActive: true,
      isArchived: false,
      weight: 0.4,
      dimensions: { length: 20, width: 15, height: 5 },
      packagingWeight: 0.1,
      variants: [
        { _id: objectId(fixtureIds.variantA), size: 'M', color: 'Black', colorHex: '#000000', sku: 'CR-E2E-BLK-M', price: 1_200, stock: 50, enabled: true, weight: 0.4, dimensions: { length: 20, width: 15, height: 5 } },
        { _id: objectId(fixtureIds.variantB), size: 'L', color: 'Black', colorHex: '#000000', sku: 'CR-E2E-BLK-L', price: 1_300, stock: 50, enabled: true, weight: 0.4, dimensions: { length: 20, width: 15, height: 5 } }
      ]
    });
    await CartModel.create({
      user: objectId(fixtureIds.customer),
      items: [{ product: objectId(fixtureIds.product), variant: objectId(fixtureIds.variantA), quantity: 1, price: 1_200 }],
      expiresAt: new Date(Date.now() + 86_400_000)
    });
    await OrderModel.create([
      {
        _id: objectId(fixtureIds.outageOrder),
        user: objectId(fixtureIds.customer),
        items: [item('a')],
        shippingAddress: address,
        billingAddress: address,
        orderNumber: 'CR-OUTAGE-ONCE',
        checkoutIdempotencyKey: '00000000-0000-4000-8000-000000000001',
        paymentMethod: 'razorpay',
        paymentMode: 'online',
        paymentProvider: 'razorpay',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        subtotal: 1_200,
        tax: 0,
        shipping: 92,
        discount: 0,
        codFee: 0,
        total: 1_292,
        amountPaid: 0,
        amountDue: 1_292,
        stockReserved: false,
        razorpayOrderId: 'order_mock_outage_once',
        paymentAttempts: [{ providerOrderId: 'order_mock_outage_once', amount: 1_292, status: 'created' }],
        timeline: [{ status: 'pending', timestamp: new Date(), note: 'Seeded provider outage checkout' }]
      },
      paidOrder(fixtureIds.ndrOrder, 'CR-E2E-NDR'),
      { ...paidOrder(fixtureIds.rtoOrder, 'CR-E2E-RTO', 'a', 2), stockReserved: true },
      { ...paidOrder(fixtureIds.returnOrder, 'CR-E2E-RETURN'), orderStatus: 'delivered' },
      { ...paidOrder(fixtureIds.exchangeOrder, 'CR-E2E-EXCHANGE'), orderStatus: 'delivered' },
      {
        _id: objectId(fixtureIds.safeDeleteOrder),
        user: objectId(fixtureIds.customer),
        items: [item('b')],
        shippingAddress: address,
        billingAddress: address,
        orderNumber: 'CR-E2E-SAFE-DELETE',
        isTestOrder: true,
        paymentMethod: 'razorpay',
        paymentMode: 'online',
        paymentProvider: 'manual',
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        fulfillmentStatus: 'cancelled',
        subtotal: 1_300,
        tax: 0,
        shipping: 0,
        discount: 0,
        codFee: 0,
        total: 1_300,
        amountPaid: 0,
        amountDue: 1_300,
        stockReserved: false,
        paymentAttempts: [],
        refunds: [],
        timeline: [{ status: 'cancelled', timestamp: new Date(), note: 'Explicit isolated test-order deletion fixture' }]
      }
    ]);
    await ShipmentModel.create([
      forwardShipment(fixtureIds.ndrShipment, fixtureIds.ndrOrder, 'CR-E2E-NDR', 'MOCKAWBNDR001', 'awb_assigned'),
      forwardShipment(fixtureIds.rtoShipment, fixtureIds.rtoOrder, 'CR-E2E-RTO', 'MOCKAWBNDR002', 'awb_assigned'),
      forwardShipment(fixtureIds.returnShipment, fixtureIds.returnOrder, 'CR-E2E-RETURN', 'MOCKAWBDELIVERED004', 'delivered'),
      forwardShipment(fixtureIds.exchangeShipment, fixtureIds.exchangeOrder, 'CR-E2E-EXCHANGE', 'MOCKAWBDELIVERED005', 'delivered')
    ]);
    console.info(JSON.stringify({
      database: mongoose.connection.name,
      seeded: true,
      fixtureIds,
      users: {
        admin: 'logistics-admin@example.test',
        customer: 'logistics-customer@example.test'
      }
    }));
  } finally {
    await disconnectDb();
  }
};

void seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Logistics E2E seed failed');
  process.exitCode = 1;
});
