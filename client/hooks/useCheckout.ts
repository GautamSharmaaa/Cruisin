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
  const cart = useCartStore.getState().items;
  return useMutation({
    mutationFn: async (input: CheckoutInput): Promise<CheckoutResult> => {
      // Ensure server-side cart matches client cart for guests: sync items before checkout
      try {
        await Promise.all(cart.map((item) => api.post('/cart/items', { product: item.product.id, variant: item.variantId, quantity: item.quantity })).map((p) => p.catch(() => undefined)));
      } catch (e) {
        // ignore sync errors; proceed to checkout which will validate cart server-side
      }
      const response = await api.post<ApiEnvelope<CheckoutResult>>('/orders/checkout', input);
      return response.data.data;
    }
  });
};
