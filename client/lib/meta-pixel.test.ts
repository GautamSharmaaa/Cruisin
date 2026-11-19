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

const pixelId = '100000000000001';
const state = vi.hoisted(() => ({
  consent: undefined as { pixelId: string; consentId: string } | undefined,
  mirror: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('@/lib/meta-consent', () => ({
  getMetaAttribution: () => typeof window === 'undefined' ? undefined : state.consent,
  getMetaPixelId: () => pixelId
}));
vi.mock('@/lib/meta-capi', () => ({ mirrorMetaEvent: state.mirror }));

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

const installWindow = (fbq?: MetaFbq): void => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { fbq, location: new URL('https://storefront.example/') }
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
    state.mirror.mockClear();
    state.consent = { pixelId, consentId: '00000000-0000-4000-8000-000000000001' };
  });

  afterEach(removeWindow);

  it('safely no-ops during SSR', () => {
    expect(initializeMetaPixel(pixelId)).toBe(false);
    expect(trackPageView('/')).toBe(false);
    expect(trackAddToCart({ contents: [{ id: 'variant-1', quantity: 1, item_price: 2499 }], value: 2499 })).toBe(false);
  });

  it('blocks both channels before consent, even with an existing fbq function', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    state.consent = undefined;
    expect(initializeMetaPixel(pixelId)).toBe(false);
    expect(trackSearch({ num_results: 1 })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
    expect(state.mirror).not.toHaveBeenCalled();
  });

  it('initializes a configured Pixel exactly once', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(initializeMetaPixel(pixelId)).toBe(true);
    expect(initializeMetaPixel(pixelId)).toBe(true);
    expect(vi.mocked(fbq).mock.calls.filter(([command]) => command === 'init')).toHaveLength(1);
    expect(fbq).toHaveBeenCalledWith('init', pixelId);
  });

  it('fires one initial PageView, one per route change, and ignores strict-mode duplicates', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(trackPageView('/')).toBe(true);
    expect(trackPageView('/')).toBe(false);
    expect(trackPageView('/shop?q=shirt')).toBe(true);
    expect(trackPageView('/shop?q=shirt')).toBe(false);
    expect(trackPageView('/')).toBe(true);
    const calls = vi.mocked(fbq).mock.calls.filter(([command]) => command === 'trackSingle');
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual(['trackSingle', pixelId, 'PageView', {}, { eventID: expect.stringMatching(/^page:/) }]);
    expect(state.mirror).toHaveBeenCalledWith(state.consent, (calls[0]?.[4] as { eventID: string }).eventID, '/', { name: 'PageView' });
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
    expect(fbq).toHaveBeenCalledWith('trackSingle', pixelId, 'ViewContent', {
      content_ids: ['variant-2499'],
      content_type: 'product',
      contents: [{ id: 'variant-2499', quantity: 1, item_price: 2499.5 }],
      currency: 'INR',
      num_items: 1,
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
    const payload = vi.mocked(fbq).mock.calls.find(call => call[2] === 'AddPaymentInfo')?.[3];
    expect(payload).toMatchObject({ currency: 'INR', value: 3500, payment_method: 'online' });
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('card_number');
    expect(payload).not.toHaveProperty('upi_id');
  });

  it('rejects invalid commerce values and empty searches without calling Meta', () => {
    const fbq = vi.fn() as unknown as MetaFbq;
    installWindow(fbq);
    expect(trackAddToCart({ contents: [{ id: '', quantity: 0, item_price: Number.NaN }], value: -1 })).toBe(false);
    expect(trackSearch({ num_results: -1 })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
  });
});
