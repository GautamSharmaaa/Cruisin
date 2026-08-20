// Governed by .rules v1.0
import { trackCustomEvent } from '@/lib/meta-pixel';

export type PromotionAnalyticsEvent =
  | 'promotion_popup_impression'
  | 'promotion_popup_dismiss'
  | 'promotion_popup_copy'
  | 'promotion_popup_apply_attempt'
  | 'promotion_popup_apply_success'
  | 'promotion_popup_apply_failure'
  | 'promotion_marquee_impression'
  | 'promotion_marquee_click'
  | 'promotion_marquee_apply_success'
  | 'promotion_marquee_apply_failure'
  | 'checkout_promotion_impression'
  | 'checkout_promotion_click'
  | 'checkout_promotion_apply_success'
  | 'checkout_promotion_apply_failure';

export interface PromotionAnalyticsProperties {
  campaign_key: string;
  promotion_id: string;
  coupon_code: string;
  placement: 'popup' | 'bag_marquee' | 'checkout_strip';
  cart_value?: number;
  item_count?: number;
  saving?: number;
  state?: 'available' | 'applied';
}

const memoryDedupe = new Set<string>();

export const trackPromotionEvent = (event: PromotionAnalyticsEvent, properties: PromotionAnalyticsProperties, dedupeKey?: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (dedupeKey) {
    const key = `cruisin:promo:analytics:${dedupeKey}`;
    if (memoryDedupe.has(key)) return false;
    try {
      if (window.sessionStorage.getItem(key)) {
        memoryDedupe.add(key);
        return false;
      }
      window.sessionStorage.setItem(key, '1');
    } catch { /* In-memory dedupe still covers Strict Mode. */ }
    memoryDedupe.add(key);
  }
  const detail = { event, properties };
  window.dispatchEvent(new CustomEvent('cruisin:analytics', { detail }));
  trackCustomEvent(event, properties as unknown as Record<string, string | number | boolean>);
  return true;
};

export const resetPromotionAnalyticsForTests = (): void => memoryDedupe.clear();
