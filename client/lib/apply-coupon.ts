// Governed by .rules v1.0
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';

export interface CouponApplication {
  coupon: string;
  discount: number;
  freeShipping: boolean;
  eligibleSubtotal?: number;
}

interface ServerCartItem { product?: string | { _id?: string; id?: string }; variant?: string | { _id?: string; id?: string }; }
interface ServerCartResponse { items?: ServerCartItem[]; }

const idString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return '';
};

export const applyCouponCode = async (code: string): Promise<CouponApplication> => {
  const cart = useCartStore.getState();
  cart.clearCoupon();
  const unavailable: typeof cart.items = [];
  const cartResponse = await api.get<ApiEnvelope<ServerCartResponse>>('/cart').catch(() => null);
  const serverItems = cartResponse?.data.data?.items ?? [];
  for (const item of cart.items) {
    const payload = { product: item.product.id, variant: item.variantId, quantity: item.quantity };
    const exists = serverItems.some((serverItem) => idString(serverItem.product) === item.product.id && idString(serverItem.variant) === item.variantId);
    await (exists ? api.put('/cart/items', payload) : api.post('/cart/items', payload)).catch(() => unavailable.push(item));
  }
  if (unavailable.length > 0) {
    unavailable.forEach((item) => useCartStore.getState().removeItem(item.product.id, item.variantId));
    throw new Error('Some unavailable items were removed. Review your Bag and try again.');
  }
  // Replace the server cart after per-item availability checks so stale server
  // lines can never inflate the coupon result for this local Bag.
  await api.put('/cart/sync', { items: cart.items.map((item) => ({ product: item.product.id, variant: item.variantId, quantity: item.quantity })) });
  const response = await api.post<ApiEnvelope<CouponApplication>>('/cart/coupon', { code });
  const applied = response.data.data;
  useCartStore.getState().setCoupon(applied.coupon, applied.discount, applied.freeShipping);
  return applied;
};
