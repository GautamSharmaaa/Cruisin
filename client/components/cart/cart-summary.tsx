// Governed by .rules v1.0
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { DeliveryPrice } from '@/components/cart/delivery-price';
import Link from 'next/link';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
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
}

export function CartSummary({ subtotal, discount = 0, freeShipping = false, shippingSettings, onCheckout }: CartSummaryProps): ReactNode {
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const { openMobileAuth } = useMobileAuthSheet();
  const [prompt, setPrompt] = useState(false);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const delivery = shippingQuote(discountedSubtotal, freeShipping, 'standard', shippingSettings);
  const total = discountedSubtotal + delivery.amount;

  useEffect(() => {
    if (user) setPrompt(false);
  }, [user]);

  const requestCheckoutAuthentication = (): void => {
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    // Radix keeps the cart drawer modal and its global pointer/scroll lock alive
    // for the 250 ms exit animation. Close it fully before mounting the next
    // modal, otherwise the old drawer leaves the visible auth sheet inert.
    onCheckout?.();
    window.setTimeout(() => {
      if (mobile) openMobileAuth({ next: ROUTES.checkout });
      else setPrompt(true);
    }, 300);
  };

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
      {discount > 0 ? <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(discount)}</span></div> : null}
      <div className="flex items-center justify-between gap-4"><span>{COPY.cart.shipping}</span><DeliveryPrice quote={delivery} /></div>
      {delivery.promotionReason === 'promotion' ? <p className="text-right text-xs text-success">Limited-time complimentary delivery applied</p> : null}
      {delivery.promotionReason === 'threshold' ? <p className="text-right text-xs text-success">Free-delivery threshold reached</p> : null}
      <div className="flex justify-between font-mono text-lg text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(total)}</span></div>
      <Link href={ROUTES.checkout} aria-disabled={!isAuthInitialized} className={'mt-4 inline-flex h-11 w-full min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98] ' + (!isAuthInitialized ? 'pointer-events-none cursor-wait opacity-70' : '')} onClick={(event) => { if (!isAuthInitialized) { event.preventDefault(); return; } if (!user) { event.preventDefault(); requestCheckoutAuthentication(); return; } const cart = useCartStore.getState(); const items = cart.items.filter((item) => isCustomerVisibleProduct(item.product)); trackCheckoutStarted({ items, value: total, coupon: cart.coupon }); onCheckout?.(); }}>{COPY.cart.checkout}</Link>
      <LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={ROUTES.checkout} action="checkout" />
    </div>
  );
}
