// Governed by .rules v1.0
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { CartModel } from '../models/cart.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { InventoryModel } from '../models/inventory.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { createAnalyticsSimulation, ANALYTICS_QA_SEED } from '../utils/analytics-simulation.js';
import { logger } from '../utils/logger.js';

const imageUrl = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85';
const markerQuery = (batchId?: string): Record<string, unknown> => batchId ? { isAnalyticsTestData: true, analyticsTestBatchId: batchId } : { isAnalyticsTestData: true };

const assertSafeEnvironment = (): void => {
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
    throw new Error('Refusing to seed analytics QA data in production');
  }
};

export const cleanupAnalyticsSimulation = async (batchId?: string): Promise<void> => {
  const query = markerQuery(batchId);
  await Promise.all([
    OrderModel.deleteMany(query),
    CartModel.deleteMany(query),
    InventoryModel.deleteMany(query),
    ProductModel.deleteMany(query),
    CategoryModel.deleteMany(query),
    CollectionModel.deleteMany(query),
    CouponModel.deleteMany(query),
    UserModel.deleteMany(query)
  ]);
};

const main = async (): Promise<void> => {
  assertSafeEnvironment();
  await connectDb();
  const seed = Number(process.env.ANALYTICS_QA_SEED ?? ANALYTICS_QA_SEED);
  const batchId = process.env.ANALYTICS_QA_BATCH_ID ?? 'ANALYTICS_QA_BATCH_' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  await cleanupAnalyticsSimulation();
  const simulation = createAnalyticsSimulation(batchId, seed);
  const categoryIds = new Map(simulation.categories.map((category) => [category.id, new Types.ObjectId()]));
  const collectionIds = new Map(simulation.collections.map((collection) => [collection.id, new Types.ObjectId()]));
  const productIds = new Map(simulation.products.map((product) => [product.id, new Types.ObjectId()]));
  const userIds = new Map(simulation.users.map((user) => [user.id, new Types.ObjectId()]));
  const variantIds = new Map(simulation.products.map((product) => [product.id, new Types.ObjectId()]));
  const passwordHash = await bcrypt.hash('AnalyticsQA123!', 10);

  await CategoryModel.insertMany(simulation.categories.map((category, index) => ({
    _id: categoryIds.get(category.id),
    name: category.name,
    slug: category.slug,
    path: category.slug,
    image: imageUrl,
    description: 'Analytics QA category for deterministic 2-month simulation.',
    heroTitle: category.name,
    breadcrumb: [{ name: category.name, slug: category.slug }],
    sortOrder: index,
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  await CollectionModel.insertMany(simulation.collections.map((collection, index) => ({
    _id: collectionIds.get(collection.id),
    title: collection.title,
    slug: collection.slug,
    description: 'Analytics QA collection for deterministic 2-month simulation.',
    heroImage: imageUrl,
    cardImage: imageUrl,
    thumbnailImage: imageUrl,
    sortOrder: index,
    isVisible: true,
    isPublished: true,
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  await ProductModel.insertMany(simulation.products.map((product, index) => {
    const variantId = variantIds.get(product.id);
    const collectionObjectIds = product.collectionIds.map((collectionId) => collectionIds.get(collectionId)).filter(Boolean);
    return {
      _id: productIds.get(product.id),
      title: product.title,
      slug: product.slug + '-' + batchId.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: 'Deterministic analytics QA product.',
      richDescription: 'Created by the analytics two-month simulation and safe to delete through analytics cleanup.',
      shortDescription: 'Analytics QA product',
      category: categoryIds.get(product.categoryId),
      categoryIds: [categoryIds.get(product.categoryId)].filter(Boolean),
      collections: collectionObjectIds,
      collectionSlugs: product.collectionIds.map((collectionId) => simulation.collections.find((collection) => collection.id === collectionId)?.slug ?? collectionId),
      images: [{ url: imageUrl, alt: product.title, width: 1200, height: 1500 }],
      imageAltText: product.title,
      basePrice: product.basePrice,
      comparePrice: Math.round(product.basePrice * 1.18),
      productCode: product.sku,
      variants: [{
        _id: variantId,
        size: 'M',
        color: 'Analytics Black',
        colorHex: '#111111',
        sku: product.sku + '-' + batchId.slice(-6),
        price: product.basePrice,
        stock: product.stock,
        enabled: true,
        lowStockThreshold: 8,
        images: [{ url: imageUrl, alt: product.title, width: 1200, height: 1500 }]
      }],
      tags: ['analytics-qa', 'deterministic'],
      status: 'published',
      visibility: 'visible',
      isActive: true,
      isAnalyticsTestData: true,
      analyticsTestBatchId: batchId
    };
  }));

  await CollectionModel.bulkWrite(simulation.collections.map((collection) => ({
    updateOne: {
      filter: { _id: collectionIds.get(collection.id) },
      update: { $set: { productIds: simulation.products.filter((product) => product.collectionIds.includes(collection.id)).map((product) => productIds.get(product.id)).filter((id): id is Types.ObjectId => Boolean(id)) } }
    }
  })));

  await InventoryModel.insertMany(simulation.products.map((product) => ({
    product: productIds.get(product.id),
    variant: variantIds.get(product.id),
    sku: product.sku + '-' + batchId.slice(-6),
    stock: Math.max(0, product.stock - 18),
    reserved: product.id.endsWith('0') ? 4 : 1,
    lowStockThreshold: 8,
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  await UserModel.insertMany(simulation.users.map((user) => ({
    _id: userIds.get(user.id),
    name: user.name,
    email: user.email,
    passwordHash,
    role: 'customer',
    status: 'active',
    isVerified: true,
    isActive: true,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.createdAt),
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  await CouponModel.insertMany(simulation.coupons.map((coupon) => ({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    usageLimit: 500,
    usedCount: simulation.orders.filter((order) => order.couponCode === coupon.code).length,
    userUsageLimit: 10,
    isActive: true,
    validFrom: new Date('2026-05-01T00:00:00.000Z'),
    validUntil: new Date('2026-07-31T23:59:59.000Z'),
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  const addressFor = (order: { city: string; state: string }, index: number) => ({
    fullName: 'QA Analytics Customer ' + index,
    phone: '+9198765' + String(index).padStart(5, '0').slice(0, 5),
    line1: 'Analytics QA Street ' + index,
    city: order.city,
    state: order.state,
    postalCode: '1100' + String(index % 100).padStart(2, '0'),
    country: 'India'
  });

  await OrderModel.insertMany(simulation.orders.map((order, index) => {
    const address = addressFor(order, index);
    return {
      user: order.userId ? userIds.get(order.userId) : undefined,
      sessionId: order.sessionId,
      items: order.items.map((item) => ({
        product: productIds.get(item.productId),
        variant: variantIds.get(item.productId),
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        image: imageUrl
      })),
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: index % 3 === 0 ? 'stripe' : 'razorpay',
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      couponCode: order.couponCode,
      refundAmount: order.refundAmount,
      notes: 'Analytics QA batch ' + batchId,
      timeline: [{ status: order.orderStatus, timestamp: new Date(order.createdAt), note: order.couponCode ? 'coupon:' + order.couponCode : 'analytics qa order' }],
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.createdAt),
      isAnalyticsTestData: true,
      analyticsTestBatchId: batchId
    };
  }));

  await CartModel.insertMany(simulation.carts.map((cart, index) => ({
    user: cart.userId ? userIds.get(cart.userId) : undefined,
    sessionId: cart.sessionId,
    items: cart.items.map((item) => ({ product: productIds.get(item.productId), variant: variantIds.get(item.productId), quantity: item.quantity, price: item.price })),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + index * 1000),
    createdAt: new Date(cart.createdAt),
    updatedAt: new Date(cart.createdAt),
    isAnalyticsTestData: true,
    analyticsTestBatchId: batchId
  })));

  const fixtureDir = path.resolve(process.cwd(), 'test-fixtures/analytics');
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(path.join(fixtureDir, 'expected-analytics-summary.json'), JSON.stringify(simulation.expected, null, 2) + '\n');
  logger.info('Analytics QA simulation seeded', { batchId, seed, orders: simulation.orders.length, users: simulation.users.length });
  await disconnectDb();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    logger.error('Analytics QA seed failed', { error });
    if (mongoose.connection.readyState !== 0) await disconnectDb();
    process.exitCode = 1;
  });
}
