// Governed by .rules v1.0
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { sendEmail } from '../utils/send-email.js';
import { PaymentService } from './payment.service.js';
import type { PaymentMethod } from '../types/payment.types.js';

const productTitle = (product: unknown): string => {
  if (typeof product === 'object' && product !== null && 'title' in product && typeof product.title === 'string') return product.title;
  return 'Cruisin item';
};

const productImage = (product: unknown): string => {
  if (typeof product === 'object' && product !== null && 'images' in product && Array.isArray(product.images)) {
    const [image] = product.images;
    if (typeof image === 'object' && image !== null && 'url' in image && typeof image.url === 'string') return image.url;
  }
  return '/product.webp';
};

const notifyOrderConfirmation = async (orderId: string): Promise<void> => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order?.user) return;
  const user = await UserModel.findById(order.user).lean();
  if (!user?.email) return;
  await sendEmail({
    to: user.email,
    subject: 'Cruisin order confirmed',
    text: 'Your Cruisin order ' + orderId + ' is confirmed.',
    html: '<p>Your Cruisin order <strong>' + orderId + '</strong> is confirmed.</p>'
  });
};

const decrementStock = async (orderId: string): Promise<void> => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  for (const item of order.items) {
    const result = await ProductModel.updateOne(
      { _id: item.product, variants: { $elemMatch: { _id: item.variant, stock: { $gte: item.quantity } } } },
      { $inc: { 'variants.$.stock': -item.quantity } }
    );
    if (result.modifiedCount === 0) throw new ApiError(409, 'Insufficient stock for ' + item.sku);
  }
};

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
    const order = await OrderModel.create({ user: userId, sessionId, items: cart.items.map((item) => ({ product: item.product, variant: item.variant, title: productTitle(item.product), sku: String(item.variant), quantity: item.quantity, price: item.price, image: productImage(item.product) })), shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: input.paymentMethod, subtotal, tax, shipping, discount, total, razorpayOrderId: input.paymentMethod === 'razorpay' ? payment.id : undefined, stripePaymentIntentId: input.paymentMethod === 'stripe' ? payment.id : undefined, timeline: [{ status: 'pending', timestamp: new Date(), note: 'Order created' }] });
    return { order, payment };
  },
  async verifyPayment(method: PaymentMethod, payload: Record<string, unknown>): Promise<{ verified: boolean; order?: unknown }> {
    const verified = await PaymentService.getProvider(method).verifyPayment(payload);
    if (!verified) return { verified };
    const providerOrderId = typeof payload.razorpay_order_id === 'string' ? payload.razorpay_order_id : undefined;
    const providerPaymentIntentId = typeof payload.paymentIntentId === 'string' ? payload.paymentIntentId : undefined;
    const lookup = providerOrderId ? { razorpayOrderId: providerOrderId } : providerPaymentIntentId ? { stripePaymentIntentId: providerPaymentIntentId } : undefined;
    if (!lookup) return { verified };
    const order = await OrderModel.findOne(lookup);
    if (!order) return { verified };
    if (order.paymentStatus !== 'paid') {
      await decrementStock(String(order._id));
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.timeline.push({ status: 'confirmed', timestamp: new Date(), note: 'Payment verified' });
      await order.save();
      await CartModel.deleteOne(order.user ? { user: order.user } : { sessionId: order.sessionId });
      await notifyOrderConfirmation(String(order._id));
    }
    return { verified, order };
  },
  async markPaymentStatus(providerId: string, status: 'paid' | 'failed'): Promise<unknown> {
    const order = await OrderModel.findOne({ $or: [{ stripePaymentIntentId: providerId }, { razorpayOrderId: providerId }] });
    if (!order) throw new ApiError(404, 'Order not found');
    if (status === 'paid' && order.paymentStatus !== 'paid') await decrementStock(String(order._id));
    order.paymentStatus = status;
    order.orderStatus = status === 'paid' ? 'confirmed' : 'pending';
    order.timeline.push({ status: order.orderStatus, timestamp: new Date(), note: status === 'paid' ? 'Webhook payment confirmed' : 'Webhook payment failed' });
    await order.save();
    if (status === 'paid') await notifyOrderConfirmation(String(order._id));
    return order;
  },
  async refund(method: PaymentMethod, paymentId: string, amount: number): Promise<unknown> {
    const refund = await PaymentService.refund(method, paymentId, amount);
    await OrderModel.findOneAndUpdate({ $or: [{ stripePaymentIntentId: paymentId }, { razorpayOrderId: paymentId }] }, { paymentStatus: 'refunded', $push: { timeline: { status: 'refunded', timestamp: new Date(), note: 'Refund created' } } });
    return refund;
  },
  async list(userId: string): Promise<unknown[]> { return OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean(); },
  async adminList(): Promise<unknown[]> { return OrderModel.find().sort({ createdAt: -1 }).limit(200).lean(); },
  async byId(id: string, user: { userId: string; role: string }): Promise<unknown> { const order = await OrderModel.findById(id).lean(); if (!order) throw new ApiError(404, 'Order not found'); if (user.role === 'customer' && String(order.user ?? '') !== user.userId) throw new ApiError(403, 'Order access denied'); return order; },
  async updateStatus(id: string, input: { status: string; note?: string; trackingNumber?: string }): Promise<unknown> { const order = await OrderModel.findByIdAndUpdate(id, { orderStatus: input.status, trackingNumber: input.trackingNumber, $push: { timeline: { status: input.status, timestamp: new Date(), note: input.note } } }, { new: true }); if (!order) throw new ApiError(404, 'Order not found'); return order; }
};
