// Governed by .rules v1.0
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OrderModel } from '../models/order.model.js';
import { formatIstDay, startOfIstDay } from '../utils/analytics-simulation.js';
import { AdminService } from './admin.service.js';

const batch = 'ANALYTICS_CORRECTNESS_QA';
const address = { fullName: 'Analytics Test', phone: '9000000000', line1: 'Test address', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' };
const base = (suffix: string, createdAt: Date, patch: Record<string, unknown> = {}) => ({
  user: new Types.ObjectId(),
  items: [{ product: new Types.ObjectId(), variant: new Types.ObjectId(), title: 'Analytics Tee', sku: `AN-${suffix}`, quantity: 1, price: 100, image: 'https://example.invalid/test.jpg' }],
  shippingAddress: address,
  billingAddress: address,
  orderNumber: `CR-ANALYTICS-QA-${suffix}`,
  paymentMethod: 'razorpay',
  paymentMode: 'online',
  paymentProvider: 'razorpay',
  paymentStatus: 'paid',
  orderStatus: 'confirmed',
  fulfillmentStatus: 'unfulfilled',
  subtotal: 100,
  tax: 0,
  shipping: 0,
  discount: 0,
  codFee: 0,
  total: 100,
  amountPaid: 100,
  amountDue: 0,
  stockReserved: false,
  analyticsTestBatchId: batch,
  isAnalyticsTestData: true,
  createdAt,
  updatedAt: createdAt,
  ...patch
});

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
  await OrderModel.deleteMany({ analyticsTestBatchId: batch });
});

afterAll(async () => {
  await OrderModel.deleteMany({ analyticsTestBatchId: batch });
  await mongoose.disconnect();
});

describe('analytics business truth', () => {
  it('counts business orders, collected revenue, refunds, COD, and the IST midnight boundary', async () => {
    const today = formatIstDay(new Date());
    const midnight = startOfIstDay(today);
    const beforeMidnight = new Date(midnight.getTime() - 1);
    const afterMidnight = new Date(midnight.getTime() + 1);
    await OrderModel.create([
      base('PAID', afterMidnight, { total: 110, subtotal: 110, amountPaid: 110 }),
      base('CANCELLED-REFUND', beforeMidnight, { paymentStatus: 'partially_refunded', orderStatus: 'cancelled', refundAmount: 20 }),
      base('FAILED', afterMidnight, { paymentStatus: 'failed', orderStatus: 'pending', amountPaid: 0, amountDue: 200, total: 200, subtotal: 200 }),
      base('COD', afterMidnight, { paymentMethod: 'cod', paymentProvider: 'cod', paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'placed', amountPaid: 0, amountDue: 80, total: 80, subtotal: 80 })
    ]);
    const previousDay = formatIstDay(beforeMidnight);
    const result = await AdminService.analyticsSummary({ startDate: previousDay, endDate: today, analyticsTestBatchId: batch });
    expect(result.summary).toMatchObject({ totalOrders: 3, paidOrders: 2, todayOrders: 2, codOrders: 1, prepaidOrders: 2, cancelledOrders: 1, failedPaymentOrders: 1, grossRevenue: 210, refunds: 20, netRevenue: 190 });
    expect(result.outstanding).toEqual({ cod: 80, partial: 0, total: 80 });
    expect(result.revenueByDay.find((row) => row.day === previousDay)).toMatchObject({ grossRevenue: 100, refunds: 20, netRevenue: 80, orders: 1 });
    expect(result.revenueByDay.find((row) => row.day === today)).toMatchObject({ grossRevenue: 110, refunds: 0, netRevenue: 110, orders: 2, codOrders: 1, pendingCod: 80 });
  });
});
