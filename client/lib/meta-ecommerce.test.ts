import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProductToCart, performWishlistToggle } from '@/lib/meta-actions';
import {
  getOrCreateCheckoutEventId,
  resetMetaEcommerceStateForTests,
  trackCheckoutPaymentSelected,
  trackCheckoutStarted,
  trackConfirmedOrderPurchase,
  trackProductView
} from '@/lib/meta-ecommerce';
import { resetMetaPixelStateForTests, type MetaFbq } from '@/lib/meta-pixel';
import { useCartStore } from '@/store/cartStore';
import type { Order } from '@/types/order.types';
import type { Product } from '@/types/product.types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const fbq = vi.fn() as unknown as MetaFbq;
const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();

const product: Product = {
  id: 'product-1',
  title: 'Cruisin Jacket',
  slug: 'cruisin-jacket',
  description: 'Jacket',
  richDescription: 'Jacket',
  brand: 'Cruisin',
  category: 'outerwear',
  categoryIds: ['outerwear'],
  collections: [],
  images: [],
  basePrice: 2499,
  variants: [{ id: 'variant-1', size: 'M', color: 'Black', colorHex: '#000000', sku: 'CJ-M-BLK', price: 2499, stock: 1, enabled: true, images: [] }],
  tags: [],
  isFeatured: false,
  ratings: { avg: 0, count: 0 },
  seo: { metaTitle: 'Cruisin Jacket', metaDesc: 'Jacket', ogImage: '' },
  reviews: []
};

const order = (paymentStatus: string, paymentMode: Order['paymentMode'] = 'online'): Order => ({
  id: 'order-123',
  orderNumber: 'CR-123',
  paymentMode,
  paymentStatus,
  total: 5088,
  subtotal: 4998,
  shipping: 90,
  discount: 0,
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
  items: [{ productId: 'product-1', variantId: 'variant-1', title: 'Cruisin Jacket', sku: 'CJ-M-BLK', quantity: 2, price: 2499, image: '' }],
  timeline: []
});

const installWindow = (): void => {
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { fbq, localStorage, sessionStorage } });
};

const removeWindow = (): void => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
};

describe('Meta ecommerce action mapping', () => {
  beforeEach(() => {
    installWindow();
    vi.mocked(fbq).mockClear();
    localStorage.clear();
    sessionStorage.clear();
    resetMetaPixelStateForTests();
    resetMetaEcommerceStateForTests();
    useCartStore.setState({ items: [], isOpen: false, coupon: undefined, couponDiscount: 0, freeShipping: false });
  });

  afterEach(removeWindow);

  it('tracks ViewContent once with the default backend variant ID', () => {
    expect(trackProductView(product)).toBe(true);
    expect(trackProductView(product)).toBe(false);
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fbq).mock.calls[0]?.[2]).toMatchObject({ content_ids: ['variant-1'], value: 2499, currency: 'INR' });
  });

  it('fires AddToCart only after the real cart state accepts the item', () => {
    const variant = product.variants[0]!;
    const addItem = useCartStore.getState().addItem;
    expect(addProductToCart({ product, variant, quantity: 1, addItem })).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(addProductToCart({ product, variant, quantity: 1, addItem })).toBe(false);
    const addCalls = vi.mocked(fbq).mock.calls.filter((call) => call[1] === 'AddToCart');
    expect(addCalls).toHaveLength(1);
    expect(addCalls[0]?.[2]).toMatchObject({ contents: [{ id: 'variant-1', quantity: 1, item_price: 2499 }], value: 2499 });
  });

  it('does not track wishlist prompts, removals, or failed API requests', async () => {
    const toggle = vi.fn();
    expect(await performWishlistToggle({ authenticated: false, product, isWishlisted: false, toggle, request: vi.fn() })).toBe('login-required');
    expect(toggle).not.toHaveBeenCalled();
    expect(await performWishlistToggle({ authenticated: true, product, isWishlisted: false, toggle, request: async () => { throw new Error('failed'); } })).toBe('failed');
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(await performWishlistToggle({ authenticated: true, product, isWishlisted: true, toggle, request: async () => undefined })).toBe('removed');
    expect(vi.mocked(fbq).mock.calls.filter((call) => call[1] === 'AddToWishlist')).toHaveLength(0);
  });

  it('tracks wishlist only after a successful add response', async () => {
    expect(await performWishlistToggle({ authenticated: true, product, isWishlisted: false, toggle: vi.fn(), request: async () => undefined })).toBe('added');
    const calls = vi.mocked(fbq).mock.calls.filter((call) => call[1] === 'AddToWishlist');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[2]).toMatchObject({ content_ids: ['variant-1'], value: 2499, currency: 'INR' });
  });

  it('does not initiate checkout for an empty cart and reuses one attempt ID', () => {
    expect(trackCheckoutStarted({ items: [], value: 0 })).toBe(false);
    const item = { product, variantId: 'variant-1', size: 'M', color: 'Black', quantity: 1, price: 2499 };
    const input = { items: [item], value: 2589, coupon: 'WELCOME' };
    const firstId = getOrCreateCheckoutEventId(input);
    expect(trackCheckoutStarted(input)).toBe(true);
    expect(trackCheckoutStarted(input)).toBe(false);
    expect(getOrCreateCheckoutEventId({ ...input, value: 2699 })).toBe(firstId);
    const calls = vi.mocked(fbq).mock.calls.filter((call) => call[1] === 'InitiateCheckout');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[3]).toEqual({ eventID: firstId });
  });

  it('sends only a payment-method category for AddPaymentInfo', () => {
    const item = { product, variantId: 'variant-1', size: 'M', color: 'Black', quantity: 1, price: 2499 };
    expect(trackCheckoutPaymentSelected({ items: [item], value: 2589 }, 'online')).toBe(true);
    const call = vi.mocked(fbq).mock.calls.find((candidate) => candidate[1] === 'AddPaymentInfo');
    expect(call?.[2]).toMatchObject({ payment_method: 'online', value: 2589, currency: 'INR' });
    expect(call?.[2]).not.toHaveProperty('email');
    expect(call?.[2]).not.toHaveProperty('phone');
  });

  it('fires Purchase only for a confirmed order and uses the final rupee total', () => {
    expect(trackConfirmedOrderPurchase(order('pending'))).toBe(false);
    expect(trackConfirmedOrderPurchase(order('failed'))).toBe(false);
    expect(trackConfirmedOrderPurchase(order('cancelled'))).toBe(false);
    expect(trackConfirmedOrderPurchase({ ...order('paid'), orderStatus: 'cancelled' })).toBe(false);
    expect(trackConfirmedOrderPurchase(order('paid'))).toBe(true);
    const call = vi.mocked(fbq).mock.calls.find((candidate) => candidate[1] === 'Purchase');
    expect(call?.[2]).toMatchObject({ content_ids: ['variant-1'], value: 5088, currency: 'INR', order_id: 'order-123', num_items: 2 });
    expect(call?.[3]).toEqual({ eventID: 'purchase:order-123' });
  });

  it('prevents duplicate Purchase on rerender and refresh while preserving a stable event ID', () => {
    const confirmed = order('cod_pending', 'cod');
    expect(trackConfirmedOrderPurchase(confirmed)).toBe(true);
    expect(trackConfirmedOrderPurchase(confirmed)).toBe(false);
    resetMetaEcommerceStateForTests();
    expect(trackConfirmedOrderPurchase(confirmed)).toBe(false);
    const calls = vi.mocked(fbq).mock.calls.filter((call) => call[1] === 'Purchase');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[3]).toEqual({ eventID: 'purchase:order-123' });
  });
});
