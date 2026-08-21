import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackCustomEvent } = vi.hoisted(() => ({ trackCustomEvent: vi.fn(() => true) }));
vi.mock('@/lib/meta-pixel', () => ({ trackCustomEvent }));

import { resetPromotionAnalyticsForTests, trackPromotionEvent } from './promotion-analytics';

class TestStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

beforeEach(() => {
  resetPromotionAnalyticsForTests();
  trackCustomEvent.mockClear();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: new TestStorage(), dispatchEvent: vi.fn() } });
  Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class { constructor(public type: string, public init: unknown) {} } });
});
afterEach(() => { Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'CustomEvent'); });

describe('promotion analytics', () => {
  const properties = { campaign_key: 'august', promotion_id: 'coupon-id', coupon_code: 'CRUISIN10', placement: 'popup' as const };

  it('deduplicates impressions across Strict Mode effects', () => {
    expect(trackPromotionEvent('promotion_popup_impression', properties, 'august:popup:/shop')).toBe(true);
    expect(trackPromotionEvent('promotion_popup_impression', properties, 'august:popup:/shop')).toBe(false);
    expect(trackCustomEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps promotion events separate from commerce lifecycle events', () => {
    trackPromotionEvent('promotion_popup_apply_success', { ...properties, saving: 300 });
    expect(trackCustomEvent).toHaveBeenCalledWith('promotion_popup_apply_success', expect.objectContaining({ saving: 300 }));
    expect(trackCustomEvent).not.toHaveBeenCalledWith('Purchase', expect.anything());
    expect(trackCustomEvent).not.toHaveBeenCalledWith('InitiateCheckout', expect.anything());
  });
});
