// Governed by .rules v1.0
"use client";
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DeliveryPrice } from '@/components/cart/delivery-price';
import { SafeImage } from '@/components/shared/safe-image';
import { COPY } from '@/constants/copy';
import { useCartRecommendations } from '@/hooks/useCartRecommendations';
import { combinedCartDiscount, recommendationBundleDiscount } from '@/lib/bundle-discount';
import { taxInclusiveCheckoutTotals } from '@/lib/checkout-totals';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { shippingQuote, type ShippingMethod, type ShippingRateSettings } from '@/lib/shipping';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export interface OrderSummaryProps {
	shippingMethod?: ShippingMethod;
	shippingSettings?: ShippingRateSettings;
	shippingAmountOverride?: number;
	codFee?: number;
	variant?: 'default' | 'mobile';
}

export function OrderSummary({ shippingMethod = 'standard', shippingSettings, shippingAmountOverride, codFee = 0, variant = 'default' }: OrderSummaryProps): ReactNode {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// call hooks unconditionally to preserve hook order
	const cartItems = useCartStore((state) => state.items);
	const coupon = useCartStore((state) => state.coupon);
	const discount = useCartStore((state) => state.couponDiscount);
	const freeShipping = useCartStore((state) => state.freeShipping);
	const items = cartItems.filter((item) => isCustomerVisibleProduct(item.product));
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const recommendations = useCartRecommendations(Array.from(new Set(items.map((item) => item.product.id))), items.length > 0);
	const discounts = combinedCartDiscount(items, discount, subtotal, recommendationBundleDiscount(items, recommendations.data));
	const discountedSubtotal = taxInclusiveCheckoutTotals(subtotal, discounts.totalDiscount, 0).discountedSubtotal;
	const delivery = shippingAmountOverride === undefined ? shippingQuote(discountedSubtotal, freeShipping, shippingMethod, shippingSettings) : { amount: shippingAmountOverride, compareAt: 0, isFree: shippingAmountOverride === 0, promotionReason: freeShipping ? 'coupon' as const : null, remainingForFreeStandardShipping: 0 };
	const totals = taxInclusiveCheckoutTotals(subtotal, discounts.totalDiscount, delivery.amount + codFee);
	if (!mounted) return null;
	return (
		<aside className={variant === 'mobile' ? 'bg-background-primary px-5 pb-6' : 'border border-border bg-background-elevated/70 p-6 shadow-lg backdrop-blur-xl lg:sticky lg:top-28'}>
			{variant === 'default' ? <><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.checkout.payment}</p><h2 className="mt-3 font-display text-3xl">{COPY.cart.title}</h2></> : null}
			<div className="mt-5 grid gap-3">{items.map((item, index) => { const itemVariant = item.product.variants.find((candidate) => candidate.id === item.variantId); const image = itemVariant?.images[0] ?? item.product.images[0]; return <article key={item.product.id + item.variantId} className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)] gap-3 border-b border-border-subtle pb-3"><div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={image?.url ?? '/cruisin-image-fallback.svg'} alt={image?.alt ?? `${item.product.title} — ${item.color}`} fill sizes="58px" className="object-cover" priority={index === 0} /></div><div className="min-w-0 self-center"><h3 className="truncate text-sm text-text-primary">{item.product.title}</h3><p className="mt-1 text-xs text-text-secondary">{item.size} / {item.color} · Qty {item.quantity}</p><p className="mt-2 font-mono text-xs text-accent-gold">{item.quantity} × {formatPrice(item.price)}</p></div></article>; })}</div>
			<div className="mt-6 space-y-4 text-sm text-text-secondary">
				<div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span className="font-mono text-text-primary">{formatPrice(subtotal)}</span></div>
				{coupon ? <div className="flex items-start justify-between gap-4 text-success"><span className="min-w-0 break-words">Coupon ({coupon})</span><span className="shrink-0 font-mono">{discounts.couponDiscount > 0 ? `-${formatPrice(discounts.couponDiscount)}` : freeShipping ? 'Free shipping' : formatPrice(0)}</span></div> : discounts.couponDiscount > 0 ? <div className="flex justify-between text-success"><span>Coupon discount</span><span className="font-mono">-{formatPrice(discounts.couponDiscount)}</span></div> : null}
				{discounts.bundleDiscount > 0 ? <div className="flex justify-between gap-4 text-success"><span>Complete the Fit saving</span><span className="shrink-0 font-mono">-{formatPrice(discounts.bundleDiscount)}</span></div> : null}
				<div className="flex items-center justify-between gap-4"><span>{COPY.cart.shipping}</span><DeliveryPrice quote={delivery} /></div>
				{codFee > 0 ? <div className="flex justify-between"><span>Cash on delivery fee</span><span className="font-mono text-text-primary">{formatPrice(codFee)}</span></div> : null}
				<div className="flex justify-between"><span>{COPY.cart.tax}</span><span className="font-mono text-success">{COPY.cart.taxIncluded}</span></div>
				<div className="flex justify-between border-t border-border pt-5 font-mono text-xl text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(totals.total)}</span></div>
				{discounts.totalDiscount > 0 ? <p className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-success">You save {formatPrice(discounts.totalDiscount)}</p> : null}
			</div>
		</aside>
	);
}
