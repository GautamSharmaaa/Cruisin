'use client';

import { Check, Gift, Tag } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CouponInput } from '@/components/cart/coupon-input';
import { usePromotionExperience } from '@/hooks/useMerchandising';
import { applyCouponCode } from '@/lib/apply-coupon';
import { safePromotionError } from '@/lib/promotion-experience';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export function OffersRewards({ bundleDiscount = 0 }: { bundleDiscount?: number }): ReactNode {
  const promotion = usePromotionExperience();
  const coupon = useCartStore((state) => state.coupon);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const [manualOpen, setManualOpen] = useState(false);
  const [message, setMessage] = useState('');
  const offer = promotion.data;
  const isApplied = Boolean(offer && coupon?.toUpperCase() === offer.promotion.code.toUpperCase());
  const apply = useMutation({
    mutationFn: () => offer ? applyCouponCode(offer.promotion.code) : Promise.reject(new Error('Offer unavailable')),
    onMutate: () => setMessage(''),
    onError: (error) => setMessage(safePromotionError(error))
  });
  return <section aria-labelledby="offers-rewards-title">
    <h2 id="offers-rewards-title" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">Offers &amp; rewards</h2>
    {offer ? <div className={'mt-4 border p-4 transition-colors ' + (isApplied ? 'border-success/50 bg-success/[0.04]' : 'border-border-subtle bg-background-elevated/60')}>
      <div className="flex items-start gap-3">
        <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-full ' + (isApplied ? 'bg-success/15 text-success' : 'bg-accent-gold/10 text-accent-gold')}>{isApplied ? <Check size={17} /> : <Gift size={17} />}</span>
        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm tracking-[0.08em] text-text-primary">{offer.promotion.code}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-accent-gold">{offer.promotion.discountLabel}</p></div>{isApplied ? <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-success">✓ Applied</span> : <button type="button" onClick={() => apply.mutate()} disabled={apply.isPending} className="min-h-11 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-gold disabled:text-text-muted">{apply.isPending ? 'Applying…' : 'Apply →'}</button>}</div>
          <p className="mt-3 text-xs leading-5 text-text-secondary">{isApplied ? (couponDiscount > 0 ? `You saved ${formatPrice(couponDiscount)} on this order.` : freeShipping ? 'Complimentary delivery is active.' : 'Your offer is active.') : `${offer.promotion.displayValue} available on this order.`}</p>
        </div>
      </div>
    </div> : null}
    {bundleDiscount > 0 ? <div className="mt-3 flex items-center gap-3 border border-border-subtle px-4 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15 text-success"><Tag size={16} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-success">✓ Bag reward</p><p className="mt-1 text-sm text-text-primary">{formatPrice(bundleDiscount)} savings unlocked</p></div></div> : null}
    <button type="button" onClick={() => setManualOpen((current) => !current)} aria-expanded={manualOpen} className="mt-3 flex min-h-11 w-full items-center justify-between border-b border-border-subtle text-left text-[10px] uppercase tracking-[0.15em] text-text-secondary"><span>Have another coupon?</span><span aria-hidden="true">{manualOpen ? '−' : '+'}</span></button>
    {manualOpen ? <CouponInput /> : null}
    {message ? <p className="mt-3 text-xs text-danger" role="alert">{message}</p> : null}
  </section>;
}
