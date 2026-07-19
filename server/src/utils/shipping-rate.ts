export type ShippingMethod = 'standard' | 'express';

export const STANDARD_SHIPPING_RATE = 900;
export const EXPRESS_SHIPPING_RATE = 1800;
export const FREE_STANDARD_SHIPPING_THRESHOLD = 25_000;

export const calculateShippingRate = (
  discountedSubtotal: number,
  freeShipping: boolean,
  method: ShippingMethod = 'standard'
): number => {
  if (freeShipping) return 0;
  if (method === 'standard' && discountedSubtotal >= FREE_STANDARD_SHIPPING_THRESHOLD) return 0;
  return method === 'express' ? EXPRESS_SHIPPING_RATE : STANDARD_SHIPPING_RATE;
};
