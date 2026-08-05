import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeMetaPixel,
  resetMetaPixelStateForTests,
  trackAddPaymentInfo,
  trackAddToCart,
  trackPageView,
  trackSearch,
  trackViewContent,
  type MetaFbq
} from '@/lib/meta-pixel';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

const installWindow = (fbq?: MetaFbq): void => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { fbq }
  });
};

const removeWindow = (): void => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
};

describe('Meta Pixel utility', () => {
  beforeEach(() => {
    resetMetaPixelStateForTests();
    vi.restoreAllMocks();
    removeWindow();
  });

  afterEach(removeWindow);

  it('safely no-ops during SSR', () => {
    expect(initializeMetaPixel('1197303799247402')).toBe(false);
    expect(trackPageView('/')).toBe(false);
    expect(trackAddToCart({ contents: [{ id: 'variant-1', quantity: 1, item_price: 2499 }], value: 2499 })).toBe(false);
  });

  it('safely no-ops when fbq is unavailable', () => {
    installWindow();
    expect(initializeMetaPixel('1197303799247402')).toBe(false);
    expect(trackSearch({ search_string: 'jacket' })).toBe(false);
  });

  it('initializes a configured Pixel exactly once', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(initializeMetaPixel('1197303799247402')).toBe(true);
    expect(initializeMetaPixel('1197303799247402')).toBe(true);
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith('init', '1197303799247402');
  });

  it('fires one initial PageView, one per route change, and ignores strict-mode duplicates', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(trackPageView('/')).toBe(true);
    expect(trackPageView('/')).toBe(false);
    expect(trackPageView('/shop?q=shirt')).toBe(true);
    expect(trackPageView('/shop?q=shirt')).toBe(false);
    expect(trackPageView('/')).toBe(true);
    expect(fbq).toHaveBeenCalledTimes(3);
    expect(fbq).toHaveBeenNthCalledWith(1, 'track', 'PageView');
  });

  it('sends typed ViewContent data in rupees and INR', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(trackViewContent({
      contents: [{ id: 'variant-2499', quantity: 1, item_price: 2499.5 }],
      value: 2499.5,
      content_name: 'Cruisin Jacket',
      content_category: 'outerwear'
    }, 'view:test')).toBe(true);
    expect(fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['variant-2499'],
      content_type: 'product',
      contents: [{ id: 'variant-2499', quantity: 1, item_price: 2499.5 }],
      currency: 'INR',
      value: 2499.5,
      content_name: 'Cruisin Jacket',
      content_category: 'outerwear'
    }, { eventID: 'view:test' });
  });

  it('whitelists AddPaymentInfo fields and does not leak arbitrary sensitive data', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    const unsafeInput = {
      contents: [{ id: 'variant-1', quantity: 1, item_price: 3500 }],
      value: 3500,
      payment_method: 'online' as const,
      email: 'customer@example.com',
      card_number: '4111111111111111',
      upi_id: 'customer@upi'
    };
    expect(trackAddPaymentInfo(unsafeInput, 'payment:test')).toBe(true);
    const payload = vi.mocked(fbq).mock.calls[0]?.[2];
    expect(payload).toMatchObject({ currency: 'INR', value: 3500, payment_method: 'online' });
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('card_number');
    expect(payload).not.toHaveProperty('upi_id');
  });

  it('rejects invalid commerce values and empty searches without calling Meta', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(trackAddToCart({ contents: [{ id: '', quantity: 0, item_price: Number.NaN }], value: -1 })).toBe(false);
    expect(trackSearch({ search_string: '   ' })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
  });
});
