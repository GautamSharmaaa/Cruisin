// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';

export interface ShippingProgressProps {
  subtotal: number;
  threshold: number;
}

const progressClass = (subtotal: number, threshold: number): string => {
  const percent = Math.min(100, (subtotal / threshold) * 100);
  if (percent >= 100) return 'w-full';
  if (percent >= 75) return 'w-3/4';
  if (percent >= 50) return 'w-1/2';
  if (percent >= 25) return 'w-1/4';
  return 'w-1/12';
};

export function ShippingProgress({ subtotal, threshold }: ShippingProgressProps): ReactNode {
  if (threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  return (
    <div>
      <p className={remaining === 0 ? 'text-sm text-success' : 'text-sm text-text-secondary'}>
        {remaining === 0 ? 'Complimentary standard delivery unlocked' : `${formatPrice(remaining)} ${COPY.cart.freeShipping}`}
      </p>
      <div className="mt-3 h-1 bg-background-input">
        <div className={'h-full bg-accent-gold transition-[width] duration-500 ' + progressClass(subtotal, threshold)} />
      </div>
    </div>
  );
}
