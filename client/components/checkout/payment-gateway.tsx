// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface PaymentGatewayProps { value: string; onChange: (value: 'razorpay' | 'stripe') => void; }
export function PaymentGateway({ value, onChange }: PaymentGatewayProps): ReactNode { return <div className="grid gap-3"><button type="button" onClick={() => onChange('razorpay')} className={'min-h-11 border p-4 text-left ' + (value === 'razorpay' ? 'border-accent-gold' : 'border-border')}>{COPY.checkout.providers.razorpay}</button><button type="button" onClick={() => onChange('stripe')} className={'min-h-11 border p-4 text-left ' + (value === 'stripe' ? 'border-accent-gold' : 'border-border')}>{COPY.checkout.providers.stripe}</button></div>; }
