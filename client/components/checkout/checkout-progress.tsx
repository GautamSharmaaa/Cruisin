// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface CheckoutProgressProps { step: number; }
export function CheckoutProgress({ step }: CheckoutProgressProps): ReactNode { const steps = [COPY.checkout.info, COPY.checkout.shipping, COPY.checkout.payment]; return <ol className="grid grid-cols-3 gap-px">{steps.map((label, index) => <li key={label} className={'relative border px-3 py-4 text-center text-xs uppercase tracking-[0.14em] transition duration-300 ' + (index <= step ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-muted')}><span className="font-mono">{String(index + 1).padStart(2, '0')}</span><span className="ml-2">{label}</span></li>)}</ol>; }
