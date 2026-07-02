// Governed by .rules v1.0
"use client";
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export interface OrderSummaryProps { }
export function OrderSummary(_props: OrderSummaryProps): ReactNode {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// call hooks unconditionally to preserve hook order
	const subtotal = useCartStore((state) => state.subtotal());
	const discount = useCartStore((state) => state.couponDiscount);
	const freeShipping = useCartStore((state) => state.freeShipping);
	if (!mounted) return null;
	const discountedSubtotal = Math.max(0, subtotal - discount);
	const shipping = freeShipping || discountedSubtotal > 25000 ? 0 : 900;
	const tax = Math.round(discountedSubtotal * 0.18);
	return (
		<aside className="border border-border bg-background-elevated/70 p-6 shadow-lg backdrop-blur-xl lg:sticky lg:top-28">
			<p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.checkout.payment}</p>
			<h2 className="mt-3 font-display text-3xl">{COPY.cart.title}</h2>
			<div className="mt-8 space-y-4 text-sm text-text-secondary">
				<div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span className="font-mono text-text-primary">{formatPrice(subtotal)}</span></div>
				{discount > 0 ? <div className="flex justify-between text-success"><span>Discount</span><span className="font-mono">-{formatPrice(discount)}</span></div> : null}
				<div className="flex justify-between"><span>{COPY.cart.shipping}</span><span className="font-mono text-text-primary">{formatPrice(shipping)}</span></div>
				<div className="flex justify-between"><span>{COPY.cart.tax}</span><span className="font-mono text-text-primary">{formatPrice(tax)}</span></div>
				<div className="flex justify-between border-t border-border pt-5 font-mono text-xl text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(discountedSubtotal + shipping + tax)}</span></div>
			</div>
		</aside>
	);
}
