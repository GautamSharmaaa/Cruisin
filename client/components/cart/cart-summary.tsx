// Governed by .rules v1.0
'use client';

import { useState, type ReactNode } from 'react';
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
  const { openMobileAuth } = useMobileAuthSheet();
  const [prompt, setPrompt] = useState(false);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const delivery = shippingQuote(discountedSubtotal, freeShipping, 'standard', shippingSettings);
  const total = discountedSubtotal + delivery.amount;

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
      {discount > 0 ? <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(discount)}</span></div> : null}
      <div className="flex items-center justify-between gap-4"><span>{COPY.cart.shipping}</span><DeliveryPrice quote={delivery} /></div>
      {delivery.promotionReason === 'promotion' ? <p className="text-right text-xs text-success">Limited-time complimentary delivery applied</p> : null}
      {delivery.promotionReason === 'threshold' ? <p className="text-right text-xs text-success">Free-delivery threshold reached</p> : null}
      <div className="flex justify-between font-mono text-lg text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(total)}</span></div>
      <Link href={ROUTES.checkout} className="mt-4 inline-flex h-11 w-full min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]" onClick={(event) => { if (!user) { event.preventDefault(); if (window.matchMedia('(max-width: 767px)').matches) openMobileAuth({ next: ROUTES.checkout }); else setPrompt(true); return; } const cart = useCartStore.getState(); const items = cart.items.filter((item) => isCustomerVisibleProduct(item.product)); trackCheckoutStarted({ items, value: total, coupon: cart.coupon }); onCheckout?.(); }}>{COPY.cart.checkout}</Link>
      <LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={ROUTES.checkout} action="checkout" />
    </div>
  );
}
