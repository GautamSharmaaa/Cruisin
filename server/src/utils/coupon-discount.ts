// Governed by .rules v1.0
import { ProductModel } from '../models/product.model.js';
import { ApiError } from './api-error.js';

interface CouponLike {
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  applicableProducts?: unknown[];
  applicableCategories?: unknown[];
  validFrom: Date;
  validUntil: Date;
}

interface CartItemLike {
  product: unknown;
  quantity: number;
  price: number;
}

interface CouponProductLike {
  _id: unknown;
  category?: unknown;
  categoryIds?: unknown[];
}

const idString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) return String(value._id);
  return String(value ?? '');
};

export const calculateCouponDiscount = async (coupon: CouponLike, items: CartItemLike[], loadedProducts?: CouponProductLike[]): Promise<{ discount: number; freeShipping: boolean; eligibleSubtotal: number }> => {
  const now = new Date();
  if (coupon.validFrom > now || coupon.validUntil < now) throw new ApiError(400, 'Coupon is not active');
  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (subtotal < coupon.minOrderValue) throw new ApiError(400, 'Order does not meet coupon minimum');

  const productTargets = new Set((coupon.applicableProducts ?? []).map(idString).filter(Boolean));
  const categoryTargets = new Set((coupon.applicableCategories ?? []).map(idString).filter(Boolean));
  const hasTargets = productTargets.size > 0 || categoryTargets.size > 0;
  if (!hasTargets) {
    const discount = coupon.type === 'freeShipping' ? 0 : Math.min(coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value, coupon.maxDiscount ?? subtotal);
    return { discount, freeShipping: coupon.type === 'freeShipping', eligibleSubtotal: subtotal };
  }

  const productIds = Array.from(new Set(items.map((item) => idString(item.product)).filter(Boolean)));
  const products = loadedProducts ?? await ProductModel.find({ _id: { $in: productIds } }).select('_id category categoryIds').lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const eligibleSubtotal = items.reduce((sum, item) => {
    const productId = idString(item.product);
    const product = productMap.get(productId);
    const productMatch = productTargets.has(productId);
    const categoryIds = [product?.category, ...(product?.categoryIds ?? [])].map(idString);
    const categoryMatch = categoryIds.some((categoryId) => categoryTargets.has(categoryId));
    return productMatch || categoryMatch ? sum + item.price * item.quantity : sum;
  }, 0);

  if (eligibleSubtotal <= 0) throw new ApiError(400, 'Coupon does not apply to items in this cart');
  const discount = coupon.type === 'freeShipping' ? 0 : Math.min(coupon.type === 'percentage' ? eligibleSubtotal * (coupon.value / 100) : coupon.value, coupon.maxDiscount ?? eligibleSubtotal);
  return { discount, freeShipping: coupon.type === 'freeShipping', eligibleSubtotal };
};
