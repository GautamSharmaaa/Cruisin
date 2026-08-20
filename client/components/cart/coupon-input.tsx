// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState, type ReactNode } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { applyCouponCode } from '@/lib/apply-coupon';
import { couponSchema } from '@/lib/schemas';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

type CouponForm = z.infer<typeof couponSchema>;
export interface CouponInputProps { }
export function CouponInput(_props: CouponInputProps): ReactNode {
  const coupon = useCartStore((state) => state.coupon);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const [editing, setEditing] = useState(false);
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
  if (coupon && !editing) return <div className="border border-success/50 bg-background-elevated p-4" aria-live="polite">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.16em] text-success">Offer applied ✓</p><p className="mt-2 break-all font-mono text-sm text-text-primary">{coupon}</p><p className="mt-1 text-xs text-text-secondary">{couponDiscount > 0 ? `You save ${formatPrice(couponDiscount)}` : freeShipping ? 'Complimentary shipping is active' : 'Saving is active'}</p></div><button type="button" className="min-h-11 shrink-0 px-2 text-xs uppercase tracking-[0.08em] text-text-secondary underline-offset-4 hover:text-text-primary hover:underline" onClick={() => setEditing(true)}>Change coupon</button></div>
    <button type="button" className="mt-2 min-h-11 text-xs uppercase tracking-[0.08em] text-text-muted underline-offset-4 hover:text-text-primary hover:underline" onClick={clearCoupon}>Remove coupon</button>
  </div>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <Input label={COPY.cart.coupon} error={formState.errors.code?.message} {...register('code')} />
        <Button type="submit" variant="secondary" className="mt-6 h-12 shrink-0" isLoading={formState.isSubmitting} disabled={formState.isSubmitting}>{COPY.cart.apply}</Button>
      </div>
      {coupon ? <button type="button" className="min-h-11 text-xs uppercase tracking-[0.08em] text-text-secondary underline-offset-4 hover:text-text-primary hover:underline" onClick={() => setEditing(false)}>Keep {coupon}</button> : null}
    </form>
  );
}
