export type ShippingMethod = 'standard' | 'express';

export const STANDARD_SHIPPING_RATE = 900;
export const EXPRESS_SHIPPING_RATE = 1800;
export const FREE_STANDARD_SHIPPING_THRESHOLD = 25_000;

export type ShippingRateSettings = {
  standardShippingRate?: number;
  expressShippingRate?: number;
  freeStandardShippingThreshold?: number;
};

const nonNegative = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

export const calculateShippingRate = (
  discountedSubtotal: number,
  freeShipping: boolean,
  method: ShippingMethod = 'standard',
  settings: ShippingRateSettings = {}
): number => {
  const subtotal = Math.max(0, discountedSubtotal);
  const standardRate = nonNegative(settings.standardShippingRate, STANDARD_SHIPPING_RATE);
  const expressRate = nonNegative(settings.expressShippingRate, EXPRESS_SHIPPING_RATE);
  const freeThreshold = nonNegative(settings.freeStandardShippingThreshold, FREE_STANDARD_SHIPPING_THRESHOLD);
  if (freeShipping) return 0;
  if (method === 'standard' && freeThreshold > 0 && subtotal >= freeThreshold) return 0;
  return method === 'express' ? expressRate : standardRate;
};
