// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { Address } from '@/types/order.types';

export interface CheckoutInput {
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: 'razorpay' | 'stripe';
  couponCode?: string;
}

export interface CheckoutResult {
  order: { _id?: string; id?: string };
  payment: { id: string; clientSecret?: string; provider: 'razorpay' | 'stripe' };
}

export const useCheckout = () => useMutation({
  mutationFn: async (input: CheckoutInput): Promise<CheckoutResult> => {
    const response = await api.post<ApiEnvelope<CheckoutResult>>('/orders/checkout', input);
    return response.data.data;
  }
});
