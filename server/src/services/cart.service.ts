// Governed by .rules v1.0
import { Types } from 'mongoose';
import { CartModel } from '../models/cart.model.js';
import { ProductModel } from '../models/product.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { ApiError } from '../utils/api-error.js';
import { calculateCouponDiscount } from '../utils/coupon-discount.js';

const cartExpiry = (): Date => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const ownerQuery = (userId?: string, sessionId?: string): Record<string, string> => {
  if (userId) return { user: userId };
  if (!sessionId || sessionId.length <= 8) throw new ApiError(400, 'A valid guest session is required');
  return { sessionId };
};
const availableVariant = async (productId: string, variantId: string) => {
  const product = await ProductModel.findOne({ _id: productId, status: 'published', visibility: 'visible', isActive: true, isArchived: { $ne: true } });
  const variant = product?.variants.find((item) => String(item._id) === variantId && item.enabled !== false);
  if (!product || !variant) throw new ApiError(400, 'Requested item is unavailable');
  return variant;
};
export const CartService = {
  async get(userId?: string, sessionId?: string): Promise<unknown> {
    return await CartModel.findOne(ownerQuery(userId, sessionId)).populate('items.product').lean() ?? { items: [] };
  },
  async add(userId: string | undefined, sessionId: string | undefined, input: { product: string; variant: string; quantity: number }): Promise<unknown> {
    const variant = await availableVariant(input.product, input.variant);
    const cart = await CartModel.findOneAndUpdate(ownerQuery(userId, sessionId), { $setOnInsert: { ...ownerQuery(userId, sessionId), expiresAt: cartExpiry() } }, { upsert: true, new: true });
    const existing = cart.items.find((item) => String(item.product) === input.product && String(item.variant) === input.variant);
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    if (nextQuantity > variant.stock) throw new ApiError(409, 'Requested quantity exceeds available stock');
    if (existing) existing.quantity = nextQuantity;
    else cart.items.push({ product: new Types.ObjectId(input.product), variant: new Types.ObjectId(input.variant), quantity: input.quantity, price: variant.price });
    await cart.save();
    return cart.populate('items.product');
  },
  async update(userId: string | undefined, sessionId: string | undefined, input: { product: string; variant: string; quantity: number }): Promise<unknown> {
    const cart = await CartModel.findOne(ownerQuery(userId, sessionId));
    if (!cart) throw new ApiError(404, 'Cart not found');
    const item = cart.items.find((entry) => String(entry.product) === input.product && String(entry.variant) === input.variant);
    if (!item) throw new ApiError(404, 'Cart item not found');
    const variant = await availableVariant(input.product, input.variant);
    if (input.quantity > variant.stock) throw new ApiError(409, 'Requested quantity exceeds available stock');
    item.quantity = input.quantity;
    await cart.save();
    return cart.populate('items.product');
  },
  async remove(userId: string | undefined, sessionId: string | undefined, product: string, variant: string): Promise<unknown> {
    const cart = await CartModel.findOne(ownerQuery(userId, sessionId));
    if (!cart) throw new ApiError(404, 'Cart not found');
    const remaining = cart.items.filter((entry) => !(String(entry.product) === product && String(entry.variant) === variant));
    cart.items.splice(0, cart.items.length, ...remaining);
    await cart.save();
    return cart.populate('items.product');
  },
  async merge(userId: string, sessionId: string): Promise<unknown> {
    const [guestCart, userCart] = await Promise.all([CartModel.findOne({ sessionId }), CartModel.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, expiresAt: cartExpiry() } }, { upsert: true, new: true })]);
    if (guestCart) { for (const item of guestCart.items) userCart.items.push(item); await userCart.save(); await guestCart.deleteOne(); }
    return userCart.populate('items.product');
  },
  async applyCoupon(userId: string | undefined, sessionId: string | undefined, code: string): Promise<unknown> {
    const cart = await CartModel.findOne(ownerQuery(userId, sessionId));
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');
    const coupon = await CouponModel.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) throw new ApiError(400, 'Invalid coupon');
    const result = await calculateCouponDiscount(coupon, cart.items);
    return { coupon: coupon.code, type: coupon.type, discount: result.discount, freeShipping: result.freeShipping, eligibleSubtotal: result.eligibleSubtotal };
  }
};
