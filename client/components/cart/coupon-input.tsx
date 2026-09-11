// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState, type ReactNode } from 'react';
import type { z } from 'zod';
import { applyCouponCode, removeCouponCode } from '@/lib/apply-coupon';
import { couponSchema } from '@/lib/schemas';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

type CouponForm = z.infer<typeof couponSchema>;
export interface CouponInputProps { }
export function CouponInput(_props: CouponInputProps): ReactNode {
  const coupon = useCartStore((state) => state.coupon);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const { register, handleSubmit, formState, setError, setValue } = useForm<CouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: coupon ?? '' }
  });
  useEffect(() => {
    setValue('code', coupon ?? '', { shouldDirty: false, shouldValidate: false });
    if (coupon) setEditing(false);
  }, [coupon, setValue]);
  const onSubmit = async (data: CouponForm): Promise<void> => {
    try {
      await applyCouponCode(data.code);
    } catch (error) {
      setError('code', { message: error instanceof Error ? error.message : 'Invalid coupon' });
    }
  };
  const remove = async (): Promise<void> => {
    setRemoving(true);
    setRemoveError('');
    try { await removeCouponCode(); }
    catch (error) { setRemoveError(error instanceof Error ? error.message : 'Coupon could not be removed'); }
    finally { setRemoving(false); }
  };
  if (coupon && !editing) return <div className="border-y border-border-subtle py-4" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0"><div className="flex items-center gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-[10px] text-success">✓</span><p className="truncate font-mono text-xs tracking-[0.08em] text-text-primary">{coupon}</p></div><p className="mt-1 pl-7 text-[11px] text-text-secondary">{couponDiscount > 0 ? `You save ${formatPrice(couponDiscount)}` : freeShipping ? 'Complimentary shipping is active' : 'Saving is active'}</p></div>
      <div className="flex shrink-0 items-center gap-3"><button type="button" className="min-h-9 text-[10px] uppercase tracking-[0.12em] text-text-secondary transition hover:text-text-primary" onClick={() => setEditing(true)} disabled={removing}>Change</button><span className="text-border-strong">•</span><button type="button" className="min-h-9 text-[10px] uppercase tracking-[0.12em] text-text-muted transition hover:text-text-primary disabled:cursor-wait" onClick={() => void remove()} disabled={removing}>{removing ? 'Removing…' : 'Remove'}</button></div>
    </div>
    {removeError ? <p role="alert" className="mt-2 text-xs text-danger">{removeError}</p> : null}
  </div>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 border-y border-border-subtle py-4">
      <div className="flex items-center justify-between gap-3"><label htmlFor="cart-coupon-code" className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Coupon Code</label>{coupon ? <button type="button" className="min-h-8 text-[10px] uppercase tracking-[0.1em] text-text-secondary transition hover:text-text-primary" onClick={() => setEditing(false)}>Keep {coupon}</button> : null}</div>
      <div className="flex h-12 items-center border border-border bg-background-input transition-colors focus-within:border-accent-gold">
        <input id="cart-coupon-code" autoComplete="off" placeholder="Enter code" aria-invalid={Boolean(formState.errors.code)} className="h-full min-w-0 flex-1 bg-transparent px-4 font-mono text-sm uppercase text-text-primary outline-none placeholder:font-sans placeholder:normal-case placeholder:text-text-muted" {...register('code')} />
        <button type="submit" className="h-full shrink-0 border-l border-border px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-gold transition hover:bg-background-elevated disabled:cursor-wait disabled:text-text-muted" disabled={formState.isSubmitting}>{formState.isSubmitting ? 'Applying…' : 'Apply'}</button>
      </div>
      {formState.errors.code?.message ? <p role="alert" className="text-xs text-danger">{formState.errors.code.message}</p> : null}
    </form>
  );
}
