// Governed by .rules v1.0
import type { ReactNode } from 'react';
import type { ShippingQuote } from '@/lib/shipping';
import { formatPrice } from '@/lib/utils';

export interface DeliveryPriceProps {
  quote: ShippingQuote;
  compact?: boolean;
}

export function DeliveryPrice({ quote, compact = false }: DeliveryPriceProps): ReactNode {
  const currentPrice = quote.isFree ? 'Free' : formatPrice(quote.amount);
  const accessibleLabel = quote.compareAt > quote.amount
    ? `Delivery ${currentPrice}, originally ${formatPrice(quote.compareAt)}`
    : `Delivery ${currentPrice}`;

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2" aria-label={accessibleLabel}>
      {quote.compareAt > quote.amount ? (
        <span aria-hidden="true" className="font-mono text-text-muted line-through decoration-danger/80">
          {formatPrice(quote.compareAt)}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={(quote.isFree ? 'text-success' : 'text-text-primary') + (compact ? '' : ' font-mono font-medium')}
      >
        {currentPrice}
      </span>
    </span>
  );
}
