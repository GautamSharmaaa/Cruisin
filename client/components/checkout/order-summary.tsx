// Governed by .rules v1.0
"use client";
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DeliveryPrice } from '@/components/cart/delivery-price';
import { SafeImage } from '@/components/shared/safe-image';
import { COPY } from '@/constants/copy';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { shippingQuote, type ShippingMethod, type ShippingRateSettings } from '@/lib/shipping';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export interface OrderSummaryProps {
	shippingMethod?: ShippingMethod;
	shippingSettings?: ShippingRateSettings;
}

export function OrderSummary({ shippingMethod = 'standard', shippingSettings }: OrderSummaryProps): ReactNode {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// call hooks unconditionally to preserve hook order
	const cartItems = useCartStore((state) => state.items);
	const discount = useCartStore((state) => state.couponDiscount);
	const freeShipping = useCartStore((state) => state.freeShipping);
	if (!mounted) return null;
	const items = cartItems.filter((item) => isCustomerVisibleProduct(item.product));
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const discountedSubtotal = Math.max(0, subtotal - discount);
	const delivery = shippingQuote(discountedSubtotal, freeShipping, shippingMethod, shippingSettings);
	const tax = Math.round(discountedSubtotal * 0.18);
	return (
		<aside className="border border-border bg-background-elevated/70 p-6 shadow-lg backdrop-blur-xl lg:sticky lg:top-28">
			<p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.checkout.payment}</p>
			<h2 className="mt-3 font-display text-3xl">{COPY.cart.title}</h2>
			<div className="mt-6 grid gap-3">{items.map((item, index) => { const variant = item.product.variants.find((candidate) => candidate.id === item.variantId); const image = variant?.images[0] ?? item.product.images[0]; return <article key={item.product.id + item.variantId} className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-3 border border-border-subtle bg-background-primary p-3"><div className="relative aspect-[3/4] overflow-hidden"><SafeImage src={image?.url ?? '/cruisin-image-fallback.svg'} alt={image?.alt ?? `${item.product.title} — ${item.color}`} fill sizes="56px" className="object-cover" priority={index === 0} /></div><div className="min-w-0"><h3 className="break-words text-sm text-text-primary">{item.product.title}</h3><p className="mt-1 text-xs text-text-secondary">{item.size} / {item.color} · Qty {item.quantity}</p>{variant?.sku ? <p className="mt-1 break-all font-mono text-[10px] text-text-muted">{variant.sku}</p> : null}<p className="mt-2 font-mono text-xs text-accent-gold">{item.quantity} × {formatPrice(item.price)}</p></div></article>; })}</div>
			<div className="mt-8 space-y-4 text-sm text-text-secondary">
				<div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span className="font-mono text-text-primary">{formatPrice(subtotal)}</span></div>
				{discount > 0 ? <div className="flex justify-between text-success"><span>Discount</span><span className="font-mono">-{formatPrice(discount)}</span></div> : null}
				<div className="flex items-center justify-between gap-4"><span>{COPY.cart.shipping}</span><DeliveryPrice quote={delivery} /></div>
				<div className="flex justify-between"><span>{COPY.cart.tax}</span><span className="font-mono text-text-primary">{formatPrice(tax)}</span></div>
				<div className="flex justify-between border-t border-border pt-5 font-mono text-xl text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(discountedSubtotal + delivery.amount + tax)}</span></div>
			</div>
		</aside>
	);
}
