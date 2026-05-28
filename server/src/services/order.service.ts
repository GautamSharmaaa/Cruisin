// Governed by .rules v1.0
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { ApiError } from '../utils/api-error.js';
import { PaymentService } from './payment.service.js';
import type { PaymentMethod } from '../types/payment.types.js';

export const OrderService = {
  async checkout(userId: string | undefined, sessionId: string | undefined, input: { shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; paymentMethod: PaymentMethod; couponCode?: string }): Promise<unknown> {
    const cart = await CartModel.findOne(userId ? { user: userId } : { sessionId }).populate('items.product');
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const coupon = input.couponCode ? await CouponModel.findOne({ code: input.couponCode.toUpperCase(), isActive: true }) : null;
    const discount = coupon ? Math.min(coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value, coupon.maxDiscount ?? subtotal) : 0;
    const shipping = subtotal - discount >= 25000 ? 0 : 900;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shipping + tax;
    const payment = await PaymentService.getProvider(input.paymentMethod).createOrder(total, 'INR', { userId: userId ?? 'guest' });
    const order = await OrderModel.create({ user: userId, sessionId, items: cart.items.map((item) => ({ product: item.product, variant: item.variant, title: 'Cruisin item', sku: String(item.variant), quantity: item.quantity, price: item.price, image: '/product.webp' })), shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: input.paymentMethod, subtotal, tax, shipping, discount, total, razorpayOrderId: input.paymentMethod === 'razorpay' ? payment.id : undefined, stripePaymentIntentId: input.paymentMethod === 'stripe' ? payment.id : undefined, timeline: [{ status: 'pending', timestamp: new Date(), note: 'Order created' }] });
    return { order, payment };
  },
  async verifyPayment(method: PaymentMethod, payload: Record<string, unknown>): Promise<{ verified: boolean }> { return { verified: await PaymentService.getProvider(method).verifyPayment(payload) }; },
  async list(userId: string): Promise<unknown[]> { return OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean(); },
  async adminList(): Promise<unknown[]> { return OrderModel.find().sort({ createdAt: -1 }).limit(200).lean(); },
  async byId(id: string): Promise<unknown> { const order = await OrderModel.findById(id).lean(); if (!order) throw new ApiError(404, 'Order not found'); return order; },
  async updateStatus(id: string, input: { status: string; note?: string; trackingNumber?: string }): Promise<unknown> { const order = await OrderModel.findByIdAndUpdate(id, { orderStatus: input.status, trackingNumber: input.trackingNumber, $push: { timeline: { status: input.status, timestamp: new Date(), note: input.note } } }, { new: true }); if (!order) throw new ApiError(404, 'Order not found'); return order; }
};
