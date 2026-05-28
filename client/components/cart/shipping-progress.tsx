// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { BRAND_CONFIG } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';

export interface ShippingProgressProps { subtotal: number; }
const progressClass = (subtotal: number): string => {
  const percent = Math.min(100, (subtotal / BRAND_CONFIG.freeShippingThreshold) * 100);
  if (percent >= 100) return 'w-full';
  if (percent >= 75) return 'w-3/4';
  if (percent >= 50) return 'w-1/2';
  if (percent >= 25) return 'w-1/4';
  return 'w-1/12';
};
export function ShippingProgress({ subtotal }: ShippingProgressProps): ReactNode { const remaining = Math.max(0, BRAND_CONFIG.freeShippingThreshold - subtotal); return <div><p className="text-sm text-text-secondary">{formatPrice(remaining)} {COPY.cart.freeShipping}</p><div className="mt-3 h-1 bg-background-input"><div className={'h-full bg-accent-gold ' + progressClass(subtotal)} /></div></div>; }
