export type ShippingMethod = 'standard' | 'express';

export interface ShippingRateSettings {
  standardShippingRate?: number;
  expressShippingRate?: number;
  freeStandardShippingThreshold?: number;
  standardShippingCompareAt?: number;
}

export const STANDARD_SHIPPING_RATE = 900;
export const EXPRESS_SHIPPING_RATE = 1800;
export const FREE_STANDARD_SHIPPING_THRESHOLD = 25_000;

export type ShippingPromotionReason = 'coupon' | 'threshold' | 'promotion' | null;

export interface ShippingQuote {
  amount: number;
  compareAt: number;
  isFree: boolean;
  promotionReason: ShippingPromotionReason;
  remainingForFreeStandardShipping: number;
}

const nonNegative = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

export const shippingQuote = (
  discountedSubtotal: number,
  freeShipping: boolean,
  method: ShippingMethod = 'standard',
  settings: ShippingRateSettings = {}
): ShippingQuote => {
  const subtotal = Math.max(0, discountedSubtotal);
  const standardRate = nonNegative(settings.standardShippingRate, STANDARD_SHIPPING_RATE);
  const expressRate = nonNegative(settings.expressShippingRate, EXPRESS_SHIPPING_RATE);
  const freeThreshold = nonNegative(settings.freeStandardShippingThreshold, FREE_STANDARD_SHIPPING_THRESHOLD);
  const configuredCompareAt = nonNegative(settings.standardShippingCompareAt, 0);
  const thresholdReached = method === 'standard' && freeThreshold > 0 && subtotal >= freeThreshold;
  const amount = freeShipping || thresholdReached ? 0 : method === 'express' ? expressRate : standardRate;
  const promotionReason: ShippingPromotionReason = freeShipping
    ? 'coupon'
    : thresholdReached
      ? 'threshold'
      : method === 'standard' && configuredCompareAt > amount
        ? 'promotion'
        : null;
  const originalStandardPrice = amount === 0 ? Math.max(standardRate, configuredCompareAt) : configuredCompareAt;
  const compareAt = method === 'standard' && originalStandardPrice > amount ? originalStandardPrice : 0;
  const remainingForFreeStandardShipping = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;

  return {
    amount,
    compareAt,
    isFree: amount === 0,
    promotionReason,
    remainingForFreeStandardShipping
  };
};

export const calculateShippingCharge = (
  discountedSubtotal: number,
  freeShipping: boolean,
  method: ShippingMethod = 'standard',
  settings: ShippingRateSettings = {}
): number => shippingQuote(discountedSubtotal, freeShipping, method, settings).amount;
