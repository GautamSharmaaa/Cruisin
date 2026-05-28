// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface ShippingMethodProps { value: string; onChange: (value: 'standard' | 'express') => void; }
export function ShippingMethod({ value, onChange }: ShippingMethodProps): ReactNode { return <div className="grid gap-3"><button type="button" onClick={() => onChange('standard')} className={'min-h-11 border p-4 text-left ' + (value === 'standard' ? 'border-accent-gold' : 'border-border')}>Standard · ₹900</button><button type="button" onClick={() => onChange('express')} className={'min-h-11 border p-4 text-left ' + (value === 'express' ? 'border-accent-gold' : 'border-border')}>Express · ₹1800</button></div>; }
