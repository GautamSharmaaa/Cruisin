// Governed by .rules v1.0
import { isMetaPurchaseConfirmed, metaPurchaseEventId, META_EVENT_LIFETIME_MS } from '@cruisin/contracts/meta-commerce';
import { getMarketingConsentId, getMetaPixelId } from '@/lib/meta-consent';
import {
  generateEventId,
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
  paymentMethods: CheckoutPaymentCategory[];
  expiresAt: number;
}

export interface CheckoutMetaInput {
  items: CartItem[];
  value: number;
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
  const content = productContent(item.product, variant ? { ...variant, price: item.price } : undefined, item.quantity);
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
  const viewKey = `${getMarketingConsentId()}:${product.slug}:${contentId}`;
  if (viewKey === lastProductViewKey) return false;
  const sent = trackViewContent(payload, generateEventId('view-content'));
  if (sent) lastProductViewKey = viewKey;
  return sent;
};

export const trackProductWishlistAdded = (product: Product, variant = defaultCommerceVariant(product)): boolean => {
  const payload = productCommerce(product, variant);
  return payload ? trackAddToWishlist(payload, generateEventId('wishlist')) : false;
};

export const trackProductCartAdded = (product: Product, variant: ProductVariant, quantity: number, confirmedPrice = variant.price): boolean => {
  const payload = productCommerce(product, { ...variant, price: confirmedPrice }, quantity);
  return payload ? trackAddToCart(payload, generateEventId('cart')) : false;
};

const checkoutFingerprint = (items: CartItem[], consentId: string): string => JSON.stringify({
  consentId,
  items: items.map(item => [item.variantId, item.quantity]).sort((left, right) => String(left[0]).localeCompare(String(right[0])))
});

let memoryAttempt: CheckoutAttemptRecord | undefined;
const readCheckoutAttempt = (): CheckoutAttemptRecord | undefined => {
  try {
    const raw = safeStorage('sessionStorage')?.getItem(checkoutAttemptStorageKey);
    if (!raw) return memoryAttempt;
    const parsed = JSON.parse(raw) as Partial<CheckoutAttemptRecord>;
    if (parsed.fingerprint && parsed.eventId && parsed.expiresAt && Array.isArray(parsed.paymentMethods)) {
      return { fingerprint: parsed.fingerprint, eventId: parsed.eventId, sent: parsed.sent === true,
        paymentMethods: parsed.paymentMethods, expiresAt: parsed.expiresAt };
    }
  } catch { /* The in-memory attempt also covers disabled storage. */ }
  return memoryAttempt;
};

const writeCheckoutAttempt = (attempt: CheckoutAttemptRecord): void => {
  memoryAttempt = attempt;
  try { safeStorage('sessionStorage')?.setItem(checkoutAttemptStorageKey, JSON.stringify(attempt)); } catch { /* Storage is optional. */ }
};

const checkoutAttempt = (input: CheckoutMetaInput): CheckoutAttemptRecord | undefined => {
  const consentId = getMarketingConsentId();
  if (!consentId || !input.items.length) return undefined;
  const fingerprint = checkoutFingerprint(input.items, consentId);
  const stored = readCheckoutAttempt();
  if (stored?.fingerprint === fingerprint && stored.expiresAt > Date.now()) return stored;
  const created = { fingerprint, eventId: generateEventId('checkout'), sent: false, paymentMethods: [], expiresAt: Date.now() + 60 * 60_000 };
  writeCheckoutAttempt(created);
  return created;
};

export const getOrCreateCheckoutEventId = (input: CheckoutMetaInput): string | undefined =>
  checkoutAttempt(input)?.eventId;

export const trackCheckoutStarted = (input: CheckoutMetaInput): boolean => {
  const contents = cartContents(input.items);
  if (!contents.length) return false;
  const attempt = checkoutAttempt(input);
  if (!attempt || attempt.sent) return false;
  const sent = trackInitiateCheckout({ contents, value: input.value }, attempt.eventId);
  if (sent) writeCheckoutAttempt({ ...attempt, sent: true });
  return sent;
};

export const trackCheckoutPaymentSelected = (input: CheckoutMetaInput, paymentMethod: CheckoutPaymentCategory): boolean => {
  const contents = cartContents(input.items);
  if (!contents.length) return false;
  const attempt = checkoutAttempt(input);
  if (!attempt || attempt.paymentMethods.includes(paymentMethod)) return false;
  const sent = trackAddPaymentInfo({ contents, value: input.value, payment_method: paymentMethod }, 'payment:' + attempt.eventId + ':' + paymentMethod);
  if (sent) writeCheckoutAttempt({ ...attempt, paymentMethods: [...attempt.paymentMethods, paymentMethod] });
  return sent;
};

export const clearMetaCheckoutAttempt = (): void => {
  memoryAttempt = undefined;
  try { safeStorage('sessionStorage')?.removeItem(checkoutAttemptStorageKey); } catch { /* Analytics storage is best-effort. */ }
};

const orderId = (order: Pick<Order, 'id' | '_id'>): string => (order.id ?? order._id ?? '').trim();

export const trackConfirmedOrderPurchase = (order: Order): boolean => {
  if (!getMarketingConsentId() || !isMetaPurchaseConfirmed({ ...order, orderStatus: order.orderStatus ?? order.status })) return false;
  const id = orderId(order);
  const receipt = order.metaPurchase;
  const confirmedAt = receipt ? Date.parse(receipt.confirmedAt) : Number.NaN;
  const age = Date.now() - confirmedAt;
  if (!receipt || receipt.pixelId !== getMetaPixelId() || receipt.eventId !== metaPurchaseEventId(id) ||
      !Number.isFinite(age) || age >= META_EVENT_LIFETIME_MS || age < -5 * 60_000) return false;
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
    value: order.total
  }, receipt.eventId);
  if (!sent) return false;
  trackedPurchases.add(id);
  try { storage?.setItem(purchaseStoragePrefix + id, 'sent'); } catch { /* The event was still queued successfully. */ }
  return true;
};

export const resetMetaEcommerceStateForTests = (): void => {
  lastProductViewKey = undefined;
  trackedPurchases.clear();
  memoryAttempt = undefined;
};
