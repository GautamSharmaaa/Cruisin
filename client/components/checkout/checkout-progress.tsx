// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface CheckoutProgressProps { step: number; }
export function CheckoutProgress({ step }: CheckoutProgressProps): ReactNode { const steps = [COPY.checkout.info, COPY.checkout.shipping, COPY.checkout.payment]; return <ol className="grid grid-cols-3 gap-px">{steps.map((label, index) => <li key={label} className={'border px-3 py-3 text-center text-xs uppercase tracking-[0.12em] ' + (index <= step ? 'border-accent-gold text-text-primary' : 'border-border text-text-muted')}>{label}</li>)}</ol>; }
