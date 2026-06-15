// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface PaymentGatewayProps { value: string; onChange: (value: 'razorpay' | 'stripe') => void; }
export function PaymentGateway({ value, onChange }: PaymentGatewayProps): ReactNode { return <div className="grid gap-3"><button type="button" onClick={() => onChange('razorpay')} className={'min-h-14 border p-4 text-left text-sm uppercase tracking-[0.1em] transition duration-300 hover:border-border-strong active:scale-[0.98] ' + (value === 'razorpay' ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary')}>{COPY.checkout.providers.razorpay}</button><button type="button" onClick={() => onChange('stripe')} className={'min-h-14 border p-4 text-left text-sm uppercase tracking-[0.1em] transition duration-300 hover:border-border-strong active:scale-[0.98] ' + (value === 'stripe' ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary')}>{COPY.checkout.providers.stripe}</button></div>; }
