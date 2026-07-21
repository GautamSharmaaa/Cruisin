// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { DeliveryPrice } from '@/components/cart/delivery-price';
import { COPY } from '@/constants/copy';
import { shippingQuote, type ShippingRateSettings } from '@/lib/shipping';

export interface ShippingMethodProps {
  value: string;
  discountedSubtotal: number;
  freeShipping: boolean;
  settings?: ShippingRateSettings;
  onChange: (value: 'standard' | 'express') => void;
}

export function ShippingMethod({ value, discountedSubtotal, freeShipping, settings, onChange }: ShippingMethodProps): ReactNode {
  const standard = shippingQuote(discountedSubtotal, freeShipping, 'standard', settings);
  const express = shippingQuote(discountedSubtotal, freeShipping, 'express', settings);
  const optionClass = (selected: boolean): string =>
    'flex min-h-16 items-center justify-between gap-4 border p-4 text-left text-sm uppercase tracking-[0.1em] transition duration-300 hover:border-border-strong active:scale-[0.98] '
    + (selected ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary');

  return (
    <div className="grid gap-3" role="group" aria-label="Shipping method">
      <button type="button" aria-pressed={value === 'standard'} onClick={() => onChange('standard')} className={optionClass(value === 'standard')}>
        <span>
          <span className="block">{COPY.checkout.shippingOptions.standard}</span>
          <span className="mt-1 block text-[10px] normal-case tracking-normal text-text-muted">Standard tracked delivery</span>
        </span>
        <DeliveryPrice quote={standard} compact />
      </button>
      <button type="button" aria-pressed={value === 'express'} onClick={() => onChange('express')} className={optionClass(value === 'express')}>
        <span>
          <span className="block">{COPY.checkout.shippingOptions.express}</span>
          <span className="mt-1 block text-[10px] normal-case tracking-normal text-text-muted">Priority tracked delivery</span>
        </span>
        <DeliveryPrice quote={express} compact />
      </button>
    </div>
  );
}
