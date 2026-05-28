// Governed by .rules v1.0
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { formatPrice } from '@/lib/utils';

export interface CartSummaryProps { subtotal: number; }
export function CartSummary({ subtotal }: CartSummaryProps): ReactNode { const shipping = subtotal > 25000 ? 0 : 900; const total = subtotal + shipping; return <div className="space-y-3 border-t border-border pt-6"><div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span>{COPY.cart.shipping}</span><span>{formatPrice(shipping)}</span></div><div className="flex justify-between font-mono text-lg text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(total)}</span></div><Button className="mt-4 w-full"><Link href={ROUTES.checkout}>{COPY.cart.checkout}</Link></Button></div>; }
