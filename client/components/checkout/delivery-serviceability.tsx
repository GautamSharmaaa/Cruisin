// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ShippingMethod } from '@/components/checkout/shipping-method';
import type { LogisticsQuote } from '@/hooks/useLogistics';
import type { ShippingRateSettings } from '@/lib/shipping';

export interface DeliveryServiceabilityProps {
  value: 'standard' | 'express';
  discountedSubtotal: number;
  freeShipping: boolean;
  settings?: ShippingRateSettings;
  quote?: LogisticsQuote;
  isLoading: boolean;
  error?: Error | null;
  postcode: string;
  onChange: (value: 'standard' | 'express') => void;
}

export function DeliveryServiceability({ value, discountedSubtotal, freeShipping, settings, quote, isLoading, error, postcode, onChange }: DeliveryServiceabilityProps): ReactNode {
  const validPostcode = /^[1-9]\d{5}$/.test(postcode);
  return <div className="grid gap-3">
    {!validPostcode ? <p className="border-l-2 border-border pl-3 text-sm text-text-secondary">Enter a six-digit delivery pincode to check courier availability.</p> : null}
    {isLoading ? <p className="border-l-2 border-accent-gold pl-3 text-sm text-text-secondary" aria-live="polite">Checking live courier availability…</p> : null}
    {quote ? <p className="border-l-2 border-success pl-3 text-sm text-text-secondary" aria-live="polite">Delivery is available. Rates are held until {new Date(quote.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.</p> : null}
    {validPostcode && error ? <p className="border-l-2 border-warning pl-3 text-sm text-text-secondary" role="status">Live courier rates are unavailable. Existing store delivery rates remain available while logistics is disabled.</p> : null}
    <ShippingMethod value={value} discountedSubtotal={discountedSubtotal} freeShipping={freeShipping} settings={settings} quoteOptions={quote?.options} onChange={onChange} />
  </div>;
}
