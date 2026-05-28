// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export interface OrderSummaryProps { }
export function OrderSummary(_props: OrderSummaryProps): ReactNode { const subtotal = useCartStore((state) => state.subtotal()); const shipping = subtotal > 25000 ? 0 : 900; const tax = Math.round(subtotal * 0.18); return <aside className="border border-border p-6 lg:sticky lg:top-24"><h2 className="font-display text-2xl">{COPY.cart.title}</h2><div className="mt-6 space-y-3 text-sm"><div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span>{COPY.cart.shipping}</span><span>{formatPrice(shipping)}</span></div><div className="flex justify-between"><span>Tax</span><span>{formatPrice(tax)}</span></div><div className="flex justify-between font-mono text-lg text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(subtotal + shipping + tax)}</span></div></div></aside>; }
