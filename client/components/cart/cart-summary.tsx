// Governed by .rules v1.0
'use client';

import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import Link from 'next/link';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export interface CartSummaryProps { subtotal: number; discount?: number; freeShipping?: boolean; onCheckout?: () => void; }
export function CartSummary({ subtotal, discount = 0, freeShipping = false, onCheckout }: CartSummaryProps): ReactNode {
  const user = useAuthStore((state) => state.user);
  const [prompt, setPrompt] = useState(false);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping = freeShipping || discountedSubtotal >= 25000 ? 0 : 900;
  const total = discountedSubtotal + shipping;

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex justify-between"><span>{COPY.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
      {discount > 0 ? <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(discount)}</span></div> : null}
      <div className="flex justify-between"><span>{COPY.cart.shipping}</span><span>{formatPrice(shipping)}</span></div>
      <div className="flex justify-between font-mono text-lg text-accent-gold"><span>{COPY.cart.total}</span><span>{formatPrice(total)}</span></div>
      <Link href={ROUTES.checkout} className="mt-4 inline-flex h-11 w-full min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]" onClick={(event) => { if (!user) { event.preventDefault(); setPrompt(true); return; } onCheckout?.(); }}>{COPY.cart.checkout}</Link>
      <LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={ROUTES.checkout} action="checkout" />
    </div>
  );
}
