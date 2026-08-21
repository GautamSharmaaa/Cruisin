// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { applyCouponCode } from '@/lib/apply-coupon';
import { trackPromotionEvent } from '@/lib/promotion-analytics';
import { interpolatePromotionCopy, promotionTemplateValues, safePromotionError } from '@/lib/promotion-experience';
import { useCartStore } from '@/store/cartStore';
import type { ActivePromotionExperience } from '@/types/promotion-experience.types';

export interface PromotionPopupProps { promotion: ActivePromotionExperience; open: boolean; onClose: (reason: 'dismiss' | 'applied') => void; }

export function PromotionPopup({ promotion, open, onClose }: PromotionPopupProps): ReactNode {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const items = useCartStore((state) => state.items);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const saving = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const values = promotionTemplateValues(promotion, saving, freeShipping);
  const analytics = { campaign_key: promotion.campaignKey, promotion_id: promotion.promotion.id, coupon_code: promotion.promotion.code, placement: 'popup' as const, cart_value: subtotal, item_count: items.reduce((sum, item) => sum + item.quantity, 0), saving };

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setSuccess(false);
    setMessage('');
    trackPromotionEvent('promotion_popup_impression', { ...analytics, state: 'available' }, `${promotion.campaignKey}:popup:${pathname}:impression`);
  // The impression belongs to opening, not subsequent cart-total changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname, promotion.campaignKey]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const apply = useMutation({
    mutationFn: () => applyCouponCode(promotion.promotion.code),
    onMutate: () => { setMessage(''); trackPromotionEvent('promotion_popup_apply_attempt', analytics); },
    onSuccess: (result) => {
      setSuccess(true);
      trackPromotionEvent('promotion_popup_apply_success', { ...analytics, saving: result.discount, state: 'applied' });
      closeTimer.current = setTimeout(() => onClose('applied'), 800);
    },
    onError: (error) => { setMessage(safePromotionError(error)); trackPromotionEvent('promotion_popup_apply_failure', analytics); }
  });

  const dismiss = (): void => {
    if (apply.isPending || success) return;
    trackPromotionEvent('promotion_popup_dismiss', analytics);
    onClose('dismiss');
  };
  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(promotion.promotion.code);
      setCopied(true);
      setMessage('');
      trackPromotionEvent('promotion_popup_copy', analytics);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setMessage('Copy is unavailable. Press and hold the code to copy it.'); }
  };

  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) dismiss(); }}><AnimatePresence>{open ? <Dialog.Portal forceMount>
    <Dialog.Overlay asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }} className="fixed inset-0 z-[140] bg-background-primary/80 backdrop-blur-sm" /></Dialog.Overlay>
    <Dialog.Content asChild aria-describedby="promotion-popup-description"><motion.section initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="promotion-popup-sheet fixed inset-x-0 bottom-0 z-[141] max-h-[min(92dvh,760px)] overflow-y-auto border-t border-accent-gold/50 bg-background-elevated px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-12 shadow-lg md:inset-0 md:m-auto md:h-fit md:w-[calc(100vw-32px)] md:max-w-lg md:border">
      <Dialog.Close asChild><button type="button" aria-label="Close promotion" disabled={apply.isPending || success} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-text-secondary outline-none transition hover:text-text-primary focus:outline-none focus-visible:outline-none disabled:opacity-40"><X size={20} /></button></Dialog.Close>
      <div className="mx-auto max-w-md text-center">
        <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-accent-gold">{interpolatePromotionCopy(promotion.popup.eyebrow, values)}</p>
        <Dialog.Title className="mt-5 font-display text-4xl font-light leading-tight text-text-primary sm:text-5xl">{success ? `${promotion.promotion.code} APPLIED ✓` : interpolatePromotionCopy(promotion.popup.headline, values)}</Dialog.Title>
        <Dialog.Description id="promotion-popup-description" className="mx-auto mt-4 max-w-sm text-sm leading-6 text-text-secondary">{success ? (saving > 0 ? `Your saving of ${values.saving} is active.` : freeShipping ? 'Complimentary shipping is active.' : 'Your offer is active.') : interpolatePromotionCopy(promotion.popup.description, values)}</Dialog.Description>
        <div className="mt-7 flex min-h-14 items-center justify-between gap-4 border border-border bg-background-primary px-4 py-2 text-left"><div className="min-w-0"><span className="block text-[9px] uppercase tracking-[0.18em] text-text-muted">Code</span><span className="select-all break-all font-mono text-base text-text-primary">{promotion.promotion.code}</span></div><button type="button" onClick={() => void copyCode()} className="flex min-h-11 shrink-0 items-center gap-2 px-2 text-[10px] uppercase tracking-[0.12em] text-accent-gold"><Copy size={14} />{copied ? 'Copied ✓' : 'Copy'}</button></div>
        <Button type="button" className="mt-4 h-12 w-full" onClick={() => apply.mutate()} disabled={success} isLoading={apply.isPending}>{success ? <><Check size={16} />Applied ✓</> : interpolatePromotionCopy(promotion.popup.primaryCta, values)}</Button>
        <button type="button" onClick={dismiss} disabled={apply.isPending || success} className="mt-3 min-h-11 w-full px-4 text-[10px] uppercase tracking-[0.14em] text-text-secondary transition hover:text-text-primary disabled:opacity-40">{interpolatePromotionCopy(promotion.popup.secondaryCta, values)}</button>
        {message ? <p className="mt-3 text-sm text-danger" aria-live="polite">{message}</p> : null}
      </div>
    </motion.section></Dialog.Content>
  </Dialog.Portal> : null}</AnimatePresence></Dialog.Root>;
}
