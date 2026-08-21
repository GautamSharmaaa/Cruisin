// Governed by .rules v1.0
'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePromotionExperience } from '@/hooks/useMerchandising';
import { applyCouponCode } from '@/lib/apply-coupon';
import { trackPromotionEvent } from '@/lib/promotion-analytics';
import { interpolatePromotionCopy, isPromotionApplied, promotionTemplateValues, safePromotionError } from '@/lib/promotion-experience';
import { useCartStore } from '@/store/cartStore';

const confettiColors = ['#DDBB83', '#FF5A5F', '#4DD0E1', '#F8E16C', '#9B8AFB', '#70D6A7'];

function CouponConfetti({ coupon }: { coupon?: string }): ReactNode {
  const previousCoupon = useRef(coupon);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const appliedNow = Boolean(coupon && coupon !== previousCoupon.current);
    previousCoupon.current = coupon;
    if (!appliedNow) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [coupon]);
  if (!visible) return null;
  return <div className="pointer-events-none fixed inset-0 z-[190] overflow-hidden" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <span key={index} className={`coupon-confetti-piece absolute -bottom-6 block ${index % 3 === 0 ? 'h-3 w-3 rounded-full' : 'h-4 w-2.5'}`} style={{ left: `${5 + ((index * 37) % 90)}%`, backgroundColor: confettiColors[index % confettiColors.length], animationDelay: `${(index % 8) * 38}ms`, animationDuration: `${1400 + (index % 6) * 110}ms`, '--confetti-x': `${-130 + ((index * 83) % 260)}px`, '--confetti-rise': `${62 + (index % 7) * 5}vh` } as CSSProperties} />)}</div>;
}

export function PromotionMarquee({ className = '' }: { className?: string }): ReactNode {
  const resource = usePromotionExperience();
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const saving = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const [message, setMessage] = useState('');
  const [tickerIndex, setTickerIndex] = useState(0);
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
  useEffect(() => {
    if (applied) return;
    const interval = window.setInterval(() => setTickerIndex((current) => current + 1), 5200);
    return () => window.clearInterval(interval);
  }, [applied, promotion?.campaignKey]);
  const apply = useMutation({
    mutationFn: () => promotion ? applyCouponCode(promotion.promotion.code) : Promise.reject(new Error('Offer unavailable')),
    onMutate: () => { setMessage(''); if (analytics) trackPromotionEvent('promotion_marquee_click', analytics); },
    onSuccess: (result) => { if (analytics) trackPromotionEvent('promotion_marquee_apply_success', { ...analytics, saving: result.discount, state: 'applied' }); },
    onError: (error) => { setMessage(safePromotionError(error)); if (analytics) trackPromotionEvent('promotion_marquee_apply_failure', analytics); }
  });
  if (!promotion?.placements.bagMarquee) return null;
  const values = promotionTemplateValues(promotion, saving, freeShipping);
  const availableCopy = interpolatePromotionCopy(promotion.marquee.available, values);
  const appliedCopy = interpolatePromotionCopy(promotion.marquee.applied, values);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const rewardMessages = itemCount >= 3
    ? ['₹300 REWARD UNLOCKED ✓']
    : itemCount >= 2
      ? ['₹100 UNLOCKED ✓', 'ADD 1 MORE · SAVE ₹300 TOTAL']
      : ['ADD 1 MORE · UNLOCK ₹100 OFF', 'ADD 2 MORE · SAVE ₹300 TOTAL'];
  const tickerMessages = [availableCopy, ...rewardMessages];
  const tickerCopy = apply.isPending ? 'APPLYING OFFER…' : tickerMessages[tickerIndex % tickerMessages.length];
  const marquee = applied
    ? <div role="status" className="flex h-[46px] items-center justify-center overflow-hidden border-y border-accent-gold/30 bg-background-elevated px-5 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-accent-gold md:h-12 md:border md:text-xs"><span className="truncate">{appliedCopy}</span></div>
    : <button type="button" onClick={() => apply.mutate()} disabled={apply.isPending} aria-label={`Apply ${promotion.promotion.code}`} className="flex h-[46px] w-full items-center justify-center overflow-hidden border-y border-accent-gold/30 bg-background-elevated px-5 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-accent-gold transition hover:border-accent-gold disabled:cursor-wait disabled:opacity-60 md:h-12 md:border md:text-xs"><span key={`${tickerIndex}-${tickerCopy}`} className="promotion-ticker-message truncate">{tickerCopy} <span className="font-semibold">· TAP TO APPLY →</span></span></button>;
  return <div className={className}>{marquee}<CouponConfetti coupon={coupon} />{message ? <p className="mx-5 mt-2 text-xs text-danger md:mx-0" aria-live="polite">{message}</p> : null}</div>;
}
