// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
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

export function CouponInput(_props: CouponInputProps): ReactNode {
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const removeItem = useCartStore((state) => state.removeItem);
  const { register, handleSubmit, formState, setError } = useForm<CouponForm>({ resolver: zodResolver(couponSchema) });
  const onSubmit = async (data: CouponForm): Promise<void> => {
    clearCoupon();
    try {
      const unavailable: typeof items = [];
      for (const item of items) {
        const payload = { product: item.product.id, variant: item.variantId, quantity: item.quantity };
        await api.put('/cart/items', payload).catch(() => api.post('/cart/items', payload)).catch(() => unavailable.push(item));
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
      <div className="flex gap-2">
        <Input label={COPY.cart.coupon} error={formState.errors.code?.message} {...register('code')} />
        <Button type="submit" variant="secondary">{COPY.cart.apply}</Button>
      </div>
      {coupon ? <p className="text-xs text-success" aria-live="polite">{coupon} applied</p> : null}
    </form>
  );
}
