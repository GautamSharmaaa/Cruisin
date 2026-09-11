// Governed by .rules v1.0
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { DeliveryPrice } from '@/components/cart/delivery-price';
import Link from 'next/link';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useCartRecommendations } from '@/hooks/useCartRecommendations';
import { combinedCartDiscount, recommendationBundleDiscount } from '@/lib/bundle-discount';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { trackCheckoutStarted } from '@/lib/meta-ecommerce';
import { shippingQuote, type ShippingRateSettings } from '@/lib/shipping';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export interface CartSummaryProps {
  subtotal: number;
  discount?: number;
  freeShipping?: boolean;
  shippingSettings?: ShippingRateSettings;
  onCheckout?: () => void;
  mobileStickyCheckout?: boolean;
}

export function CartSummary({ subtotal, discount = 0, freeShipping = false, shippingSettings, onCheckout, mobileStickyCheckout = false }: CartSummaryProps): ReactNode {
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const { openMobileAuth } = useMobileAuthSheet();
  const [prompt, setPrompt] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const recommendations = useCartRecommendations(Array.from(new Set(cartItems.map((item) => item.product.id))), cartItems.length > 0);
  const discounts = combinedCartDiscount(cartItems, discount, subtotal, recommendationBundleDiscount(cartItems, recommendations.data));
  const discountedSubtotal = Math.max(0, subtotal - discounts.totalDiscount);
  const delivery = shippingQuote(discountedSubtotal, freeShipping, 'standard', shippingSettings);
  const total = discountedSubtotal + delivery.amount;

  useEffect(() => {
    if (user) setPrompt(false);
  }, [user]);

  const requestCheckoutAuthentication = (): void => {
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    if (!mobile) {
      setPrompt(true);
      return;
    }

    // Radix keeps the cart drawer modal and its global pointer/scroll lock alive
    // for the 250 ms exit animation. Close it fully before mounting the next
    // mobile auth surface, otherwise the old drawer leaves it inert. The
    // desktop prompt belongs to this drawer subtree, so it must open before
    // the drawer is ever unmounted.
    onCheckout?.();
    window.setTimeout(() => {
      openMobileAuth({ next: ROUTES.checkout });
    }, 300);
  };

  const checkout = <Link href={ROUTES.checkout} aria-disabled={!isAuthInitialized} className={'inline-flex h-14 w-full min-w-11 flex-col items-center justify-center gap-0.5 bg-accent-gold px-2 font-body text-[9px] font-semibold uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98] md:h-11 md:flex-row md:text-xs md:tracking-[0.14em] ' + (!isAuthInitialized ? 'pointer-events-none cursor-wait opacity-70' : '')} onClick={(event) => { if (!isAuthInitialized) { event.preventDefault(); return; } if (!user) { event.preventDefault(); requestCheckoutAuthentication(); return; } const cart = useCartStore.getState(); const items = cart.items.filter((item) => isCustomerVisibleProduct(item.product)); trackCheckoutStarted({ items, value: total, coupon: cart.coupon }); onCheckout?.(); }}><span>{COPY.cart.checkout}</span><span className="font-mono text-sm tracking-normal md:hidden">{formatPrice(total)}</span></Link>;

  return (
    <div className="border-t border-border pt-6">
      <div className="space-y-4 text-sm text-text-secondary">
      <div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span className="font-mono text-text-primary">{formatPrice(subtotal)}</span></div>
      {discounts.couponDiscount > 0 ? <div className="flex justify-between text-success"><span>Coupon{coupon ? ` (${coupon})` : ''}</span><span>-{formatPrice(discounts.couponDiscount)}</span></div> : null}
      {discounts.bundleDiscount > 0 ? <div className="flex justify-between text-success"><span>Complete the Fit saving</span><span>-{formatPrice(discounts.bundleDiscount)}</span></div> : null}
      <div className="flex items-center justify-between gap-4"><span>{COPY.cart.shipping}</span><DeliveryPrice quote={delivery} /></div>
      {delivery.promotionReason === 'promotion' ? <p className="text-right text-xs text-success">Limited-time complimentary delivery applied</p> : null}
      <div className="flex justify-between"><span>{COPY.cart.tax}</span><span>{COPY.cart.taxIncluded}</span></div>
      <div className="flex justify-between border-t border-border pt-5 font-mono text-xl text-accent-gold"><span className="font-body font-medium text-text-primary">{COPY.cart.total}</span><span>{formatPrice(total)}</span></div>
      </div>
      {mobileStickyCheckout ? <><div className="fixed inset-x-0 bottom-0 z-[130] grid grid-cols-2 gap-2 border-t border-border bg-background-primary/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl md:hidden"><div className="grid h-14 place-items-center"><span className="brand-wordmark-script auth-wordmark-motion text-[36px] leading-none">Cruisin</span></div>{checkout}</div><div className="mt-5 hidden md:block">{checkout}</div></> : <div className="mt-5">{checkout}</div>}
      <LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={ROUTES.checkout} action="checkout" />
    </div>
  );
}
