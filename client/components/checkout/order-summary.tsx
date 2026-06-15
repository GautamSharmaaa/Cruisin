// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export interface OrderSummaryProps { }
export function OrderSummary(_props: OrderSummaryProps): ReactNode { const subtotal = useCartStore((state) => state.subtotal()); const shipping = subtotal > 25000 ? 0 : 900; const tax = Math.round(subtotal * 0.18); return <aside className="border border-border bg-background-elevated/70 p-6 shadow-lg backdrop-blur-xl lg:sticky lg:top-28"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.checkout.payment}</p><h2 className="mt-3 font-display text-3xl">{COPY.cart.title}</h2><div className="mt-8 space-y-4 text-sm text-text-secondary"><div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span className="font-mono text-text-primary">{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span>{COPY.cart.shipping}</span><span className="font-mono text-text-primary">{formatPrice(shipping)}</span></div><div className="flex justify-between"><span>{COPY.cart.tax}</span><span className="font-mono text-text-primary">{formatPrice(tax)}</span></div><div className="flex justify-between border-t border-border pt-5 font-mono text-xl text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(subtotal + shipping + tax)}</span></div></div></aside>; }
