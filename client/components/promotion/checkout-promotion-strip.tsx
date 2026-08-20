// Governed by .rules v1.0
'use client';

import { useMutation } from '@tanstack/react-query';
import { Check, Gift } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { usePromotionExperience } from '@/hooks/useMerchandising';
import { applyCouponCode } from '@/lib/apply-coupon';
import { trackPromotionEvent } from '@/lib/promotion-analytics';
import { interpolatePromotionCopy, isPromotionApplied, promotionTemplateValues, safePromotionError } from '@/lib/promotion-experience';
import { useCartStore } from '@/store/cartStore';

export function CheckoutPromotionStrip({ disabled = false }: { disabled?: boolean }): ReactNode {
  const resource = usePromotionExperience();
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const saving = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const [message, setMessage] = useState('');
  const promotion = resource.data;
  const applied = promotion ? isPromotionApplied(promotion, coupon) : false;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const analytics = promotion ? { campaign_key: promotion.campaignKey, promotion_id: promotion.promotion.id, coupon_code: promotion.promotion.code, placement: 'checkout_strip' as const, cart_value: subtotal, item_count: items.reduce((sum, item) => sum + item.quantity, 0), saving } : null;
  useEffect(() => {
    if (!promotion?.placements.checkoutStrip || !analytics) return;
    trackPromotionEvent('checkout_promotion_impression', { ...analytics, state: applied ? 'applied' : 'available' }, `${promotion.campaignKey}:checkout-strip:impression`);
  // Impression dedupe intentionally ignores subsequent pricing changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion?.campaignKey, promotion?.placements.checkoutStrip]);
  const apply = useMutation({
    mutationFn: () => promotion ? applyCouponCode(promotion.promotion.code) : Promise.reject(new Error('Offer unavailable')),
    onMutate: () => { setMessage(''); if (analytics) trackPromotionEvent('checkout_promotion_click', analytics); },
    onSuccess: (result) => { if (analytics) trackPromotionEvent('checkout_promotion_apply_success', { ...analytics, saving: result.discount, state: 'applied' }); },
    onError: (error) => { setMessage(safePromotionError(error)); if (analytics) trackPromotionEvent('checkout_promotion_apply_failure', analytics); }
  });
  if (!promotion?.placements.checkoutStrip) return null;
  const values = promotionTemplateValues(promotion, saving, freeShipping);
  const copy = apply.isPending ? 'APPLYING OFFER…' : interpolatePromotionCopy(applied ? promotion.checkout.applied : promotion.checkout.available, values);
  const contents = <span className="flex items-center justify-center gap-3"><span className="shrink-0 text-accent-gold">{applied ? <Check size={16} /> : <Gift size={16} />}</span><span>{copy}</span></span>;
  return <div>{applied ? <div role="status" className="border border-border bg-background-elevated px-5 py-4 text-center text-xs uppercase tracking-[0.12em] text-text-primary">{contents}</div> : <button type="button" onClick={() => apply.mutate()} disabled={disabled || apply.isPending} className="w-full border border-border bg-background-elevated px-5 py-4 text-center text-xs uppercase tracking-[0.12em] text-text-primary transition hover:border-accent-gold disabled:cursor-wait disabled:opacity-60">{contents}</button>}{message ? <p className="mt-2 text-center text-xs text-danger" aria-live="polite">{message}</p> : null}</div>;
}
