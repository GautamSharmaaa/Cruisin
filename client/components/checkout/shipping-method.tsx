// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface ShippingMethodProps { value: string; onChange: (value: 'standard' | 'express') => void; }
export function ShippingMethod({ value, onChange }: ShippingMethodProps): ReactNode { return <div className="grid gap-3"><button type="button" onClick={() => onChange('standard')} className={'min-h-14 border p-4 text-left text-sm uppercase tracking-[0.1em] transition duration-300 hover:border-border-strong active:scale-[0.98] ' + (value === 'standard' ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary')}>{COPY.checkout.shippingOptions.standard}</button><button type="button" onClick={() => onChange('express')} className={'min-h-14 border p-4 text-left text-sm uppercase tracking-[0.1em] transition duration-300 hover:border-border-strong active:scale-[0.98] ' + (value === 'express' ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary')}>{COPY.checkout.shippingOptions.express}</button></div>; }
