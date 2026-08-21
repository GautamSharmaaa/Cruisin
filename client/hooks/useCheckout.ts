// Governed by .rules v1.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/lib/api';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { flushCartMutations } from '@/lib/server-cart';
import type { ShippingMethod } from '@/lib/shipping';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { Address, CheckoutPaymentDto } from '@/types/order.types';

export interface CheckoutInput {
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: 'razorpay' | 'cod';
  paymentMode: 'online' | 'cod' | 'partial';
  shippingMethod: ShippingMethod;
  logisticsQuoteId?: string;
  couponCode?: string;
  idempotencyKey?: string;
  metaEventId?: string;
}

export interface CheckoutResult {
  order: { _id?: string; id?: string; orderNumber?: string; paymentMode?: 'online' | 'cod' | 'partial'; paymentStatus?: string; amountPaid?: number; amountDue?: number; total?: number };
  payment: CheckoutPaymentDto | null;
  amountToPay: number;
  reused?: boolean;
}

const attemptStorageKey = 'cruisin:checkout-attempt';
const checkoutFingerprint = (input: CheckoutInput, items: ReturnType<typeof useCartStore.getState>['items'], coupon?: string): string => {
  const source = JSON.stringify({
    items: items.map((item) => [item.product.id, item.variantId, item.quantity, item.price]).sort(),
    paymentMode: input.paymentMode,
    shippingMethod: input.shippingMethod,
    coupon: coupon ?? '',
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
};

const checkoutAttemptKey = (fingerprint: string): string => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(attemptStorageKey) ?? 'null') as { fingerprint?: string; key?: string } | null;
    if (stored?.fingerprint === fingerprint && stored.key) return stored.key;
    const key = crypto.randomUUID();
    sessionStorage.setItem(attemptStorageKey, JSON.stringify({ fingerprint, key }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
};

export const clearCheckoutAttempt = (): void => {
  try { sessionStorage.removeItem(attemptStorageKey); } catch { /* storage may be unavailable */ }
};

export const useCheckout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckoutInput): Promise<CheckoutResult> => {
      await flushCartMutations();
      const authoritativeCart = useCartStore.getState();
      const checkoutItems = authoritativeCart.items.filter((item) => isCustomerVisibleProduct(item.product));
      if (checkoutItems.length === 0) throw new Error('Cart is empty');
      const endpoint = input.paymentMode === 'cod' ? '/orders/cod' : input.paymentMode === 'partial' ? '/orders/partial/create' : '/payments/razorpay/create-order';
      const fingerprint = checkoutFingerprint(input, checkoutItems, authoritativeCart.coupon);
      const idempotencyKey = input.idempotencyKey ?? checkoutAttemptKey(fingerprint);
      const response = await api.post<ApiEnvelope<CheckoutResult>>(endpoint, { ...input, idempotencyKey, couponCode: authoritativeCart.coupon, expectedCartVersion: authoritativeCart.version });
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['account'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      ]);
    },
    onError: (error): void => {
      const data = error instanceof ApiRequestError && error.data && typeof error.data === 'object'
        ? error.data as { retryWithNewAttempt?: unknown }
        : undefined;
      if (data?.retryWithNewAttempt === true) clearCheckoutAttempt();
    }
  });
};
