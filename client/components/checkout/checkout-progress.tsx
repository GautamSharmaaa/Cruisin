// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface CheckoutProgressProps { step: number; }
export function CheckoutProgress({ step }: CheckoutProgressProps): ReactNode { const steps = [COPY.checkout.info, COPY.checkout.shipping, COPY.checkout.payment]; return <ol className="grid grid-cols-3 gap-px">{steps.map((label, index) => <li key={label} className={'relative border px-1 py-3 text-center text-[10px] uppercase tracking-[0.1em] transition duration-300 sm:px-3 sm:py-4 sm:text-xs sm:tracking-[0.14em] ' + (index <= step ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-muted')}><span className="font-mono">{String(index + 1).padStart(2, '0')}</span><span className="ml-1 min-[380px]:ml-2">{label}</span></li>)}</ol>; }
