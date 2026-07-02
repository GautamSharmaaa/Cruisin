// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { Address, CheckoutPaymentDto } from '@/types/order.types';

export interface CheckoutInput {
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: 'razorpay' | 'stripe';
  couponCode?: string;
}

export interface CheckoutResult {
  order: { _id?: string; id?: string };
  payment: CheckoutPaymentDto;
}

export const useCheckout = () => {
  return useMutation({
    mutationFn: async (input: CheckoutInput): Promise<CheckoutResult> => {
      const cartState = useCartStore.getState();
      const unavailable: typeof cartState.items = [];
      for (const item of cartState.items) {
        const payload = { product: item.product.id, variant: item.variantId, quantity: item.quantity };
        await api.put('/cart/items', payload).catch(() => api.post('/cart/items', payload)).catch(() => unavailable.push(item));
      }
      if (unavailable.length > 0) {
        const store = useCartStore.getState();
        unavailable.forEach((item) => store.removeItem(item.product.id, item.variantId));
        throw new Error('Some unavailable items were removed. Review your bag and try again.');
      }
      const response = await api.post<ApiEnvelope<CheckoutResult>>('/orders/checkout', { ...input, couponCode: cartState.coupon });
      return response.data.data;
    }
  });
};
