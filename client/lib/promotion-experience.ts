// Governed by .rules v1.0
import { formatPrice } from '@/lib/utils';
import type { ActivePromotionExperience, PromotionTemplateValues } from '@/types/promotion-experience.types';

export const interpolatePromotionCopy = (template: string, values: PromotionTemplateValues): string => template.replace(/{{\s*(code|discount|saving)\s*}}/g, (_, key: keyof PromotionTemplateValues) => values[key]);

export const promotionTemplateValues = (promotion: ActivePromotionExperience, saving: number, freeShipping = false): PromotionTemplateValues => ({
  code: promotion.promotion.code,
  discount: promotion.promotion.discountLabel,
  saving: saving > 0 ? formatPrice(saving) : freeShipping ? 'FREE SHIPPING' : formatPrice(0)
});

export const isPromotionApplied = (promotion: ActivePromotionExperience, coupon?: string): boolean => coupon?.trim().toUpperCase() === promotion.promotion.code.trim().toUpperCase();

export const isPromotionBrowsingPath = (pathname: string): boolean => {
  if (pathname === '/') return true;
  return ['/shop', '/product/', '/category/', '/collections', '/men', '/women', '/sale', '/new-featured'].some((prefix) => pathname === prefix || pathname.startsWith(prefix));
};

export const promotionStorageKey = (promotion: ActivePromotionExperience): string => `cruisin:promo:${promotion.campaignKey}:seen`;

export const promotionFrequencyReached = (promotion: ActivePromotionExperience, pathname: string, alwaysSeenContexts: Set<string>, now = Date.now()): boolean => {
  if (typeof window === 'undefined') return true;
  const key = promotionStorageKey(promotion);
  try {
    if (promotion.popup.frequency === 'once_per_session') return window.sessionStorage.getItem(key) !== null;
    if (promotion.popup.frequency === 'once_per_24_hours') {
      const lastSeenAt = Number(window.localStorage.getItem(key));
      return Number.isFinite(lastSeenAt) && lastSeenAt > 0 && now - lastSeenAt < 24 * 60 * 60 * 1000;
    }
  } catch { /* Storage failure should not break the storefront. */ }
  return promotion.popup.frequency === 'always' && alwaysSeenContexts.has(`${promotion.campaignKey}:${pathname}`);
};

export const markPromotionSeen = (promotion: ActivePromotionExperience, pathname: string, alwaysSeenContexts: Set<string>, now = Date.now()): void => {
  const key = promotionStorageKey(promotion);
  alwaysSeenContexts.add(`${promotion.campaignKey}:${pathname}`);
  try {
    if (promotion.popup.frequency === 'once_per_session') window.sessionStorage.setItem(key, String(now));
    if (promotion.popup.frequency === 'once_per_24_hours') window.localStorage.setItem(key, String(now));
  } catch { /* Frequency remains best-effort when storage is unavailable. */ }
};

export const safePromotionError = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('empty')) return 'Add an item to your Bag to use this offer.';
  if (message.includes('minimum')) return 'Add more eligible items to use this offer.';
  if (message.includes('does not apply') || message.includes('unavailable')) return 'Add eligible products to use this offer.';
  if (message.includes('not active') || message.includes('invalid') || message.includes('expired') || message.includes('usage limit')) return 'This offer is no longer available.';
  return "This offer isn't eligible for your current Bag.";
};
