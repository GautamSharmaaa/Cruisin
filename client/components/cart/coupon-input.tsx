// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { couponSchema } from '@/lib/schemas';
import { useCartStore } from '@/store/cartStore';

type CouponForm = z.infer<typeof couponSchema>;
export interface CouponInputProps { }
export function CouponInput(_props: CouponInputProps): ReactNode { const setCoupon = useCartStore((state) => state.setCoupon); const { register, handleSubmit, formState } = useForm<CouponForm>({ resolver: zodResolver(couponSchema) }); const onSubmit = (data: CouponForm): void => setCoupon(data.code); return <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2"><Input label={COPY.cart.coupon} error={formState.errors.code?.message} {...register('code')} /><Button type="submit" variant="secondary">{COPY.cart.apply}</Button></form>; }
