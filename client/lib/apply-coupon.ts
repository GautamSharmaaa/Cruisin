// Governed by .rules v1.0
import { api } from '@/lib/api';
import { flushCartMutations, type ServerCart } from '@/lib/server-cart';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';

export interface CouponApplication {
  coupon: string;
  discount: number;
  freeShipping: boolean;
  eligibleSubtotal?: number;
  bundleDiscount?: number;
  version?: number;
  cart?: ServerCart;
}

export const applyCouponCode = async (code: string): Promise<CouponApplication> => {
  await flushCartMutations();
  const state = useCartStore.getState();
  const response = await api.post<ApiEnvelope<CouponApplication>>('/cart/coupon', {
    code,
    expectedVersion: state.version
  });
  const applied = response.data.data;
  const current = useCartStore.getState();
  const responseVersion = applied.cart?.version ?? applied.version ?? current.version;
  if (responseVersion >= current.version) {
    if (applied.cart) current.replaceFromServer(applied.cart);
    else current.setCoupon(applied.coupon, applied.discount, applied.freeShipping, applied.version);
  }
  return applied;
};

export const removeCouponCode = async (): Promise<void> => {
  await flushCartMutations();
  const state = useCartStore.getState();
  const response = await api.delete<ApiEnvelope<ServerCart>>('/cart/coupon', { data: { expectedVersion: state.version } });
  const current = useCartStore.getState();
  if ((response.data.data.version ?? current.version) >= current.version) current.replaceFromServer(response.data.data);
};
