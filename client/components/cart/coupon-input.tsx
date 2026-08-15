// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { api } from '@/lib/api';
import { couponSchema } from '@/lib/schemas';
import { useCartStore } from '@/store/cartStore';

type CouponForm = z.infer<typeof couponSchema>;
export interface CouponInputProps { }
interface CouponApplyResponse { coupon: string; discount: number; freeShipping: boolean; }
interface ApiEnvelope<TData> { data: TData; message: string; }
interface ServerCartItem { product?: string | { _id?: string; id?: string }; variant?: string | { _id?: string; id?: string }; }
interface ServerCartResponse { items?: ServerCartItem[]; }

const idString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return '';
};

export function CouponInput(_props: CouponInputProps): ReactNode {
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const removeItem = useCartStore((state) => state.removeItem);
  const { register, handleSubmit, formState, setError, setValue } = useForm<CouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: coupon ?? '' }
  });
  useEffect(() => {
    setValue('code', coupon ?? '', { shouldDirty: false, shouldValidate: false });
  }, [coupon, setValue]);
  const onSubmit = async (data: CouponForm): Promise<void> => {
    clearCoupon();
    try {
      const unavailable: typeof items = [];
      const cartResponse = await api.get<ApiEnvelope<ServerCartResponse>>('/cart').catch(() => null);
      const serverItems = cartResponse?.data.data?.items ?? [];
      for (const item of items) {
        const payload = { product: item.product.id, variant: item.variantId, quantity: item.quantity };
        const exists = serverItems.some((serverItem) => idString(serverItem.product) === item.product.id && idString(serverItem.variant) === item.variantId);
        await (exists ? api.put('/cart/items', payload) : api.post('/cart/items', payload)).catch(() => unavailable.push(item));
      }
      if (unavailable.length > 0) {
        unavailable.forEach((item) => removeItem(item.product.id, item.variantId));
        setError('code', { message: 'Some unavailable items were removed. Review your bag and try again.' });
        return;
      }
      const response = await api.post<ApiEnvelope<CouponApplyResponse>>('/cart/coupon', { code: data.code });
      setCoupon(response.data.data.coupon, response.data.data.discount, response.data.data.freeShipping);
    } catch (error) {
      setError('code', { message: error instanceof Error ? error.message : 'Invalid coupon' });
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <Input label={COPY.cart.coupon} error={formState.errors.code?.message} {...register('code')} />
        <Button type="submit" variant="secondary" className="mt-6 h-12 shrink-0" isLoading={formState.isSubmitting} disabled={formState.isSubmitting}>{COPY.cart.apply}</Button>
      </div>
      {coupon ? <div className="flex items-center justify-between gap-3" aria-live="polite"><p className="text-xs text-success">{coupon} applied</p><button type="button" className="min-h-11 px-2 text-xs uppercase tracking-[0.08em] text-text-secondary underline-offset-4 hover:text-text-primary hover:underline" onClick={clearCoupon}>Remove coupon</button></div> : null}
    </form>
  );
}
