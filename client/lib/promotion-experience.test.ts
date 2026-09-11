import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { interpolatePromotionCopy, markPromotionSeen, promotionFrequencyReached, safePromotionError } from './promotion-experience';
import type { ActivePromotionExperience } from '@/types/promotion-experience.types';

class TestStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
}

const promotion = (campaignKey: string, frequency: ActivePromotionExperience['popup']['frequency']): ActivePromotionExperience => ({
  enabled: true,
  campaignKey,
  promotion: { id: 'coupon-id', code: 'CRUISIN10', type: 'percentage', value: 10, displayValue: '10% OFF', discountLabel: '10%' },
  placements: { popup: true, bagMarquee: true, checkoutStrip: true },
  popup: { eyebrow: 'PRIVATE', headline: '{{discount}} OFF', description: '{{code}}', primaryCta: 'APPLY', secondaryCta: 'CONTINUE', delayMs: 2500, frequency },
  marquee: { available: '{{code}}', applied: '{{saving}}' },
  checkout: { available: '{{code}}', applied: '{{saving}}' },
  schedule: {}
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: new TestStorage(), localStorage: new TestStorage() } });
});
afterEach(() => { Reflect.deleteProperty(globalThis, 'window'); });

describe('promotion copy', () => {
  it('interpolates only approved runtime tokens', () => {
    expect(interpolatePromotionCopy('{{code}} · {{discount}} · {{saving}} · {{unknown}}', { code: 'CRUISIN10', discount: '10%', saving: '₹300' })).toBe('CRUISIN10 · 10% · ₹300 · {{unknown}}');
  });

  it('maps server failures to safe customer copy', () => {
    expect(safePromotionError(new Error('Cart is empty'))).toContain('Add an item');
    expect(safePromotionError(new Error('Coupon is not active'))).toBe('This offer is no longer available.');
    expect(safePromotionError(new Error('Order does not meet coupon minimum'))).toContain('Add more');
  });
});

describe('campaign-aware frequency', () => {
  it('records once-per-session state per campaign', () => {
    const contexts = new Set<string>();
    const first = promotion('campaign-a', 'once_per_session');
    expect(promotionFrequencyReached(first, '/product/a', contexts, 100)).toBe(false);
    markPromotionSeen(first, '/product/a', contexts, 100);
    expect(promotionFrequencyReached(first, '/product/b', contexts, 101)).toBe(true);
    expect(promotionFrequencyReached(promotion('campaign-b', 'once_per_session'), '/product/b', contexts, 101)).toBe(false);
  });

  it('expires 24-hour state and treats always as once per route context', () => {
    const contexts = new Set<string>();
    const daily = promotion('daily', 'once_per_24_hours');
    markPromotionSeen(daily, '/shop', contexts, 1_000);
    expect(promotionFrequencyReached(daily, '/shop', contexts, 1_000 + 23 * 60 * 60 * 1000)).toBe(true);
    expect(promotionFrequencyReached(daily, '/shop', contexts, 1_000 + 25 * 60 * 60 * 1000)).toBe(false);
    const always = promotion('always', 'always');
    markPromotionSeen(always, '/shop', contexts, 1_000);
    expect(promotionFrequencyReached(always, '/shop', contexts)).toBe(true);
    expect(promotionFrequencyReached(always, '/product/a', contexts)).toBe(false);
  });
});
