// Governed by .rules v1.0
import { api, ApiRequestError } from '@/lib/api';
import { mapProduct, type ApiProduct } from '@/lib/product-mapper';
import type { CartItem } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';

export interface ServerCartItem {
  product: ApiProduct | string;
  variant: string | { _id?: string; id?: string };
  quantity: number;
  price: number;
}

export interface ServerCart {
  items: ServerCartItem[];
  version?: number;
  couponCode?: string;
  couponDiscount?: number;
  couponFreeShipping?: boolean;
  couponEligibleSubtotal?: number;
}

export interface AuthoritativeCartState {
  items: CartItem[];
  version: number;
  coupon?: string;
  couponDiscount: number;
  freeShipping: boolean;
}

export type CartMutation =
  | { kind: 'add'; product: string; variant: string; quantity: number }
  | { kind: 'update'; product: string; variant: string; quantity: number }
  | { kind: 'remove'; product: string; variant: string };

const idString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return '';
};

export const toAuthoritativeCartState = (cart: ServerCart, fallbackItems: CartItem[] = []): AuthoritativeCartState => {
  const fallback = new Map(fallbackItems.map((item) => [`${item.product.id}:${item.variantId}`, item]));
  const items = (cart.items ?? []).flatMap((line): CartItem[] => {
    const productId = idString(line.product);
    const variantId = idString(line.variant);
    const prior = fallback.get(`${productId}:${variantId}`);
    const product = typeof line.product === 'string' ? prior?.product : mapProduct(line.product);
    if (!product) return [];
    const variant = product.variants.find((candidate) => candidate.id === variantId);
    if (!variant && !prior) return [];
    return [{
      product,
      variantId,
      size: variant?.size ?? prior?.size ?? '',
      color: variant?.color ?? prior?.color ?? '',
      quantity: line.quantity,
      price: line.price
    }];
  });
  return {
    items,
    version: cart.version ?? 0,
    coupon: cart.couponCode,
    couponDiscount: cart.couponDiscount ?? 0,
    freeShipping: cart.couponFreeShipping ?? false
  };
};

const executeMutation = async (mutation: CartMutation, expectedVersion: number): Promise<ServerCart> => {
  const payload = { product: mutation.product, variant: mutation.variant, quantity: mutation.kind === 'remove' ? undefined : mutation.quantity, expectedVersion };
  if (mutation.kind === 'add') {
    const response = await api.post<ApiEnvelope<ServerCart>>('/cart/items', payload);
    return response.data.data;
  }
  if (mutation.kind === 'update') {
    const response = await api.put<ApiEnvelope<ServerCart>>('/cart/items', payload);
    return response.data.data;
  }
  const response = await api.delete<ApiEnvelope<ServerCart>>(`/cart/items/${mutation.product}/${mutation.variant}`, { params: { expectedVersion } });
  return response.data.data;
};

let mutationTail: Promise<void> = Promise.resolve();
let latestMutationError: Error | undefined;

export const enqueueCartMutation = (
  mutation: CartMutation,
  getVersion: () => number,
  apply: (cart: ServerCart) => void,
  setSyncState: (state: 'syncing' | 'idle' | 'error', error?: string) => void
): void => {
  mutationTail = mutationTail.then(async () => {
    setSyncState('syncing');
    try {
      let result: ServerCart;
      try {
        result = await executeMutation(mutation, getVersion());
      } catch (error) {
        if (!(error instanceof ApiRequestError) || error.status !== 409 || !error.data) throw error;
        const latest = error.data as ServerCart;
        apply(latest);
        result = await executeMutation(mutation, latest.version ?? 0);
      }
      apply(result);
      latestMutationError = undefined;
      setSyncState('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bag could not be synchronized';
      latestMutationError = error instanceof Error ? error : new Error(message);
      setSyncState('error', message);
    }
  });
};

export const flushCartMutations = async (): Promise<void> => {
  await mutationTail;
  if (latestMutationError) throw latestMutationError;
};

export const loadServerCart = async (): Promise<ServerCart> => {
  await flushCartMutations();
  const response = await api.get<ApiEnvelope<ServerCart>>('/cart');
  return response.data.data;
};

export const synchronizeServerCart = async (items: CartItem[], expectedVersion: number): Promise<ServerCart> => {
  await flushCartMutations();
  const response = await api.put<ApiEnvelope<ServerCart>>('/cart/sync', {
    items: items.map((item) => ({ product: item.product.id, variant: item.variantId, quantity: item.quantity })),
    expectedVersion
  });
  return response.data.data;
};
