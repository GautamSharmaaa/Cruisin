// Governed by .rules v1.0
import { isOrderPaymentConfirmed } from '@/lib/payment-status';
import {
  generateEventId,
  purchaseEventId,
  trackAddToCart,
  trackAddPaymentInfo,
  trackAddToWishlist,
  trackInitiateCheckout,
  trackPurchase,
  trackViewContent,
  type MetaCommerceInput,
  type MetaContentInput
} from '@/lib/meta-pixel';
import type { CartItem } from '@/store/cartStore';
import type { Order, OrderItem } from '@/types/order.types';
import type { Product, ProductVariant } from '@/types/product.types';

interface CheckoutAttemptRecord {
  fingerprint: string;
  eventId: string;
  sent: boolean;
}

export interface CheckoutMetaInput {
  items: CartItem[];
  value: number;
  coupon?: string;
}

export type CheckoutPaymentCategory = 'cod' | 'online' | 'online_partial';

const checkoutAttemptStorageKey = 'cruisin:meta:checkout-attempt';
const purchaseStoragePrefix = 'cruisin:meta:purchase:';
let lastProductViewKey: string | undefined;
const trackedPurchases = new Set<string>();

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const safeStorage = (kind: 'localStorage' | 'sessionStorage'): Storage | undefined => {
  if (typeof window === 'undefined') return undefined;
  try { return window[kind]; } catch { return undefined; }
};

export const defaultCommerceVariant = (product: Product): ProductVariant | undefined => product.variants.find((variant) => variant.enabled !== false && variant.stock > 0)
  ?? product.variants.find((variant) => variant.enabled !== false)
  ?? product.variants[0];

export const productContent = (product: Product, variant: ProductVariant | undefined, quantity = 1): MetaContentInput | null => {
  const normalizedQuantity = Math.floor(quantity);
  if (!variant?.id.trim() || normalizedQuantity <= 0 || !Number.isFinite(variant.price) || variant.price < 0) return null;
  return { id: variant.id.trim(), quantity: normalizedQuantity, item_price: roundMoney(variant.price) };
};

export const productCommerce = (product: Product, variant = defaultCommerceVariant(product), quantity = 1): MetaCommerceInput | null => {
  const content = productContent(product, variant, quantity);
  if (!content) return null;
  return {
    contents: [content],
    value: roundMoney(content.item_price * content.quantity),
    content_name: product.title,
    content_category: product.category
  };
};

export const cartContents = (items: CartItem[]): MetaContentInput[] => items.flatMap((item) => {
  const variant = item.product.variants.find((candidate) => candidate.id === item.variantId);
  const content = productContent(item.product, variant, item.quantity);
  return content ? [content] : [];
});

export const orderContents = (items: OrderItem[]): MetaContentInput[] => items.flatMap((item) => {
  const id = (item.variantId ?? item.variant ?? '').trim();
  const quantity = Math.floor(item.quantity);
  const itemPrice = roundMoney(item.price);
  if (!id || quantity <= 0 || !Number.isFinite(itemPrice) || itemPrice < 0) return [];
  return [{ id, quantity, item_price: itemPrice }];
});

export const trackProductView = (product: Product): boolean => {
  const payload = productCommerce(product);
  if (!payload) return false;
  const contentId = payload.contents[0]?.id;
  const viewKey = `${product.slug}:${contentId}`;
  if (viewKey === lastProductViewKey) return false;
  const sent = trackViewContent(payload, generateEventId('view-content'));
  if (sent) lastProductViewKey = viewKey;
  return sent;
};

export const trackProductWishlistAdded = (product: Product, variant = defaultCommerceVariant(product)): boolean => {
  const payload = productCommerce(product, variant);
  return payload ? trackAddToWishlist(payload, generateEventId('wishlist')) : false;
};

export const trackProductCartAdded = (product: Product, variant: ProductVariant, quantity: number): boolean => {
  const payload = productCommerce(product, variant, quantity);
  return payload ? trackAddToCart(payload, generateEventId('cart')) : false;
};

const checkoutFingerprint = ({ items, value, coupon }: CheckoutMetaInput): string => JSON.stringify({
  items: cartContents(items).map((item) => [item.id, item.quantity, item.item_price]).sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
  coupon: coupon?.trim() ?? ''
});

const readCheckoutAttempt = (): CheckoutAttemptRecord | null => {
  try {
    const parsed = JSON.parse(safeStorage('sessionStorage')?.getItem(checkoutAttemptStorageKey) ?? 'null') as Partial<CheckoutAttemptRecord> | null;
    return parsed?.fingerprint && parsed.eventId ? { fingerprint: parsed.fingerprint, eventId: parsed.eventId, sent: parsed.sent === true } : null;
  } catch { return null; }
};

const writeCheckoutAttempt = (attempt: CheckoutAttemptRecord): void => {
  try { safeStorage('sessionStorage')?.setItem(checkoutAttemptStorageKey, JSON.stringify(attempt)); } catch { /* Analytics storage is best-effort. */ }
};

export const getOrCreateCheckoutEventId = (input: CheckoutMetaInput): string => {
  const fingerprint = checkoutFingerprint(input);
  const stored = readCheckoutAttempt();
  if (stored?.fingerprint === fingerprint) return stored.eventId;
  const eventId = generateEventId('checkout');
  writeCheckoutAttempt({ fingerprint, eventId, sent: false });
  return eventId;
};

export const trackCheckoutStarted = (input: CheckoutMetaInput): boolean => {
  const contents = cartContents(input.items);
  if (contents.length === 0) return false;
  const fingerprint = checkoutFingerprint(input);
  const eventId = getOrCreateCheckoutEventId(input);
  const stored = readCheckoutAttempt();
  if (stored?.fingerprint === fingerprint && stored.eventId === eventId && stored.sent) return false;
  const sent = trackInitiateCheckout({
    contents,
    value: input.value,
    num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
    coupon: input.coupon
  }, eventId);
  if (sent) writeCheckoutAttempt({ fingerprint, eventId, sent: true });
  return sent;
};

export const trackCheckoutPaymentSelected = (input: CheckoutMetaInput, paymentMethod: CheckoutPaymentCategory): boolean => {
  const contents = cartContents(input.items);
  if (contents.length === 0) return false;
  return trackAddPaymentInfo({
    contents,
    value: input.value,
    num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
    payment_method: paymentMethod
  }, generateEventId('payment-info'));
};

export const clearMetaCheckoutAttempt = (): void => {
  try { safeStorage('sessionStorage')?.removeItem(checkoutAttemptStorageKey); } catch { /* Analytics storage is best-effort. */ }
};

const orderId = (order: Pick<Order, 'id' | '_id'>): string => (order.id ?? order._id ?? '').trim();

export const trackConfirmedOrderPurchase = (order: Order): boolean => {
  if (!isOrderPaymentConfirmed(order)) return false;
  if ((order.orderStatus ?? order.status) === 'cancelled') return false;
  const id = orderId(order);
  const contents = orderContents(order.items);
  if (!id || contents.length === 0 || !Number.isFinite(order.total) || order.total < 0) return false;
  if (trackedPurchases.has(id)) return false;
  const storage = safeStorage('localStorage');
  try {
    if (storage?.getItem(purchaseStoragePrefix + id) === 'sent') {
      trackedPurchases.add(id);
      return false;
    }
  } catch { /* The in-memory guard still prevents rerender duplicates. */ }
  const sent = trackPurchase({
    order_id: id,
    contents,
    value: order.total,
    num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
    coupon: order.couponCode
  }, purchaseEventId(id));
  if (!sent) return false;
  trackedPurchases.add(id);
  try { storage?.setItem(purchaseStoragePrefix + id, 'sent'); } catch { /* The event was still queued successfully. */ }
  return true;
};

export const resetMetaEcommerceStateForTests = (): void => {
  lastProductViewKey = undefined;
  trackedPurchases.clear();
};
