// Governed by .rules v1.0
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OrderModel } from '../models/order.model.js';
import { OrderManagementService } from './order-management.service.js';

const prefix = 'CR-ORDER-MGMT-QA-';
const adminId = new Types.ObjectId().toString();
const address = { fullName: 'Test Customer', phone: '9000000000', line1: 'Test address', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' };
const order = (suffix: string, patch: Record<string, unknown> = {}) => ({
  user: new Types.ObjectId(),
  items: [{ product: new Types.ObjectId(), variant: new Types.ObjectId(), title: 'Test Tee', sku: `TEST-${suffix}`, quantity: 1, price: 100, image: 'https://example.invalid/test.jpg' }],
  shippingAddress: address,
  billingAddress: address,
  orderNumber: `${prefix}${suffix}`,
  paymentMethod: 'razorpay',
  paymentMode: 'online',
  paymentProvider: 'razorpay',
  paymentStatus: 'pending',
  orderStatus: 'pending',
  fulfillmentStatus: 'unfulfilled',
  subtotal: 100,
  tax: 0,
  shipping: 0,
  discount: 0,
  codFee: 0,
  total: 100,
  amountPaid: 0,
  amountDue: 100,
  stockReserved: false,
  isTestOrder: true,
  ...patch
});

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
  await OrderModel.deleteMany({ orderNumber: { $regex: `^${prefix}` } });
});

afterAll(async () => {
  await OrderModel.deleteMany({ orderNumber: { $regex: `^${prefix}` } });
  await mongoose.disconnect();
});

describe('order archive and permanent-delete safety', () => {
  it('classifies explicit unpaid tests, real orders, and financial records distinctly', async () => {
    const [safe, real, paid] = await OrderModel.create([
      order('SAFE'),
      order('REAL', { isTestOrder: false }),
      order('PAID', { paymentStatus: 'paid', amountPaid: 100, amountDue: 0, razorpayPaymentId: 'pay_real_reference' })
    ]);
    await expect(OrderManagementService.deleteEligibility(String(safe._id))).resolves.toMatchObject({ eligible: true, classification: 'SAFE_TEST_ORDER', blockers: [] });
    await expect(OrderManagementService.deleteEligibility(String(real._id))).resolves.toMatchObject({ eligible: false, classification: 'REAL_ORDER_ARCHIVE_ONLY' });
    await expect(OrderManagementService.deleteEligibility(String(paid._id))).resolves.toMatchObject({ eligible: false, classification: 'UNSAFE_TO_DELETE' });
  });

  it('archives and restores without changing financial or fulfilment fields', async () => {
    const created = await OrderModel.create(order('ARCHIVE', { paymentStatus: 'paid', amountPaid: 100, amountDue: 0, orderStatus: 'shipped', fulfillmentStatus: 'partially_fulfilled' }));
    await OrderManagementService.archive(String(created._id), adminId, 'Owner organization');
    const archived = await OrderModel.findById(created._id).lean();
    expect(archived).toMatchObject({ paymentStatus: 'paid', amountPaid: 100, orderStatus: 'shipped', fulfillmentStatus: 'partially_fulfilled', archiveReason: 'Owner organization' });
    expect(archived?.archivedAt).toBeInstanceOf(Date);
    await OrderManagementService.restore(String(created._id));
    const restored = await OrderModel.findById(created._id).lean();
    expect(restored?.archivedAt).toBeUndefined();
    expect(restored).toMatchObject({ paymentStatus: 'paid', amountPaid: 100, orderStatus: 'shipped', fulfillmentStatus: 'partially_fulfilled' });
  });

  it('fails closed and preserves the order when the local MongoDB target cannot provide a transaction', async () => {
    const created = await OrderModel.create(order('TRANSACTION'));
    await expect(OrderManagementService.permanentlyDelete(String(created._id), adminId, { orderNumber: `${prefix}TRANSACTION`, reason: 'Transaction safety test' })).rejects.toMatchObject({ statusCode: 409 });
    expect(await OrderModel.exists({ _id: created._id })).not.toBeNull();
  });
});
