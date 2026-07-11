// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { Address, CheckoutPaymentDto } from '@/types/order.types';

export interface CheckoutInput {
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: 'razorpay' | 'cod';
  paymentMode: 'online' | 'cod' | 'partial';
  couponCode?: string;
}

export interface CheckoutResult {
  order: { _id?: string; id?: string; orderNumber?: string; paymentMode?: 'online' | 'cod' | 'partial'; paymentStatus?: string; amountPaid?: number; amountDue?: number; total?: number };
  payment: CheckoutPaymentDto | null;
  amountToPay: number;
}

interface ServerCartItem {
  product?: string | { _id?: string; id?: string };
  variant?: string | { _id?: string; id?: string };
}

interface ServerCartResponse {
  items?: ServerCartItem[];
}

const refId = (value: ServerCartItem['product']): string => {
  if (typeof value === 'string') return value;
  return value?._id ?? value?.id ?? '';
};

export const useCheckout = () => {
  return useMutation({
    mutationFn: async (input: CheckoutInput): Promise<CheckoutResult> => {
      const cartState = useCartStore.getState();
      const checkoutItems = cartState.items.filter((item) => isCustomerVisibleProduct(item.product));
      if (checkoutItems.length === 0) throw new Error('Cart is empty');
      const serverCartResponse = await api.get<ApiEnvelope<ServerCartResponse>>('/cart').catch(() => null);
      const serverItems = serverCartResponse?.data.data?.items ?? [];
      const checkoutKeys = new Set(checkoutItems.map((item) => item.product.id + ':' + item.variantId));
      await Promise.all(serverItems.map(async (item) => {
        const productId = refId(item.product);
        const variantId = refId(item.variant);
        if (!productId || !variantId || checkoutKeys.has(productId + ':' + variantId)) return;
        await api.delete('/cart/items/' + encodeURIComponent(productId) + '/' + encodeURIComponent(variantId)).catch(() => undefined);
      }));
      const unavailable: typeof checkoutItems = [];
      for (const item of checkoutItems) {
        const payload = { product: item.product.id, variant: item.variantId, quantity: item.quantity };
        await api.put('/cart/items', payload).catch(() => api.post('/cart/items', payload)).catch(() => unavailable.push(item));
      }
      if (unavailable.length > 0) {
        const store = useCartStore.getState();
        unavailable.forEach((item) => store.removeItem(item.product.id, item.variantId));
        throw new Error('Some unavailable items were removed. Review your bag and try again.');
      }
      const endpoint = input.paymentMode === 'cod' ? '/orders/cod' : input.paymentMode === 'partial' ? '/orders/partial/create' : '/payments/razorpay/create-order';
      const response = await api.post<ApiEnvelope<CheckoutResult>>(endpoint, { ...input, couponCode: cartState.coupon });
      return response.data.data;
    }
  });
};
