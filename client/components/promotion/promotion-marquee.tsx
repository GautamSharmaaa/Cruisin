// Governed by .rules v1.0
'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { usePromotionExperience } from '@/hooks/useMerchandising';
import { applyCouponCode } from '@/lib/apply-coupon';
import { trackPromotionEvent } from '@/lib/promotion-analytics';
import { interpolatePromotionCopy, isPromotionApplied, promotionTemplateValues, safePromotionError } from '@/lib/promotion-experience';
import { useCartStore } from '@/store/cartStore';

export function PromotionMarquee({ className = '' }: { className?: string }): ReactNode {
  const resource = usePromotionExperience();
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const saving = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const [message, setMessage] = useState('');
  const promotion = resource.data;
  const applied = promotion ? isPromotionApplied(promotion, coupon) : false;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const analytics = promotion ? { campaign_key: promotion.campaignKey, promotion_id: promotion.promotion.id, coupon_code: promotion.promotion.code, placement: 'bag_marquee' as const, cart_value: subtotal, item_count: items.reduce((sum, item) => sum + item.quantity, 0), saving } : null;
  useEffect(() => {
    if (!promotion?.placements.bagMarquee || !analytics) return;
    trackPromotionEvent('promotion_marquee_impression', { ...analytics, state: applied ? 'applied' : 'available' }, `${promotion.campaignKey}:bag-marquee:impression`);
  // Impression dedupe intentionally ignores subsequent pricing changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion?.campaignKey, promotion?.placements.bagMarquee]);
  const apply = useMutation({
    mutationFn: () => promotion ? applyCouponCode(promotion.promotion.code) : Promise.reject(new Error('Offer unavailable')),
    onMutate: () => { setMessage(''); if (analytics) trackPromotionEvent('promotion_marquee_click', analytics); },
    onSuccess: (result) => { if (analytics) trackPromotionEvent('promotion_marquee_apply_success', { ...analytics, saving: result.discount, state: 'applied' }); },
    onError: (error) => { setMessage(safePromotionError(error)); if (analytics) trackPromotionEvent('promotion_marquee_apply_failure', analytics); }
  });
  if (!promotion?.placements.bagMarquee) return null;
  const values = promotionTemplateValues(promotion, saving, freeShipping);
  const copy = apply.isPending ? 'APPLYING OFFER…' : interpolatePromotionCopy(applied ? promotion.marquee.applied : promotion.marquee.available, values);
  const content = <><span className="sr-only">{copy}</span><span aria-hidden="true" className="promotion-marquee-track flex min-w-max items-center">{Array.from({ length: 4 }, (_, index) => <span key={index} className="px-8">{copy}<span className="px-8 opacity-60">•</span></span>)}</span></>;
  return <div className={className}>{applied ? <div role="status" className="promotion-marquee overflow-hidden border border-accent-gold bg-accent-gold py-3 text-xs uppercase tracking-[0.14em] text-text-inverse">{content}</div> : <button type="button" onClick={() => apply.mutate()} disabled={apply.isPending} aria-label={copy} className="promotion-marquee block w-full overflow-hidden border border-accent-gold bg-accent-gold py-3 text-left text-xs uppercase tracking-[0.14em] text-text-inverse transition hover:brightness-105 disabled:cursor-wait">{content}</button>}{message ? <p className="mt-2 text-xs text-danger" aria-live="polite">{message}</p> : null}</div>;
}
