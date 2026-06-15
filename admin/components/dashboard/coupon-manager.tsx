// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useArchiveCoupon, useCreateCoupon } from '@/hooks/useAdminMutations';
import { adminCouponSchema } from '@/lib/schemas';
import type { CouponDto } from '@/types/dto.types';

export interface CouponManagerProps {
  coupons: CouponDto[];
  isLoading: boolean;
}

type CouponFormValues = z.infer<typeof adminCouponSchema>;

const couponId = (coupon: CouponDto): string => coupon.id ?? coupon._id ?? coupon.code;

export function CouponManager({ coupons, isLoading }: CouponManagerProps): ReactNode {
  const createCoupon = useCreateCoupon();
  const archiveCoupon = useArchiveCoupon();
  const { register, handleSubmit, formState, reset } = useForm<CouponFormValues>({ resolver: zodResolver(adminCouponSchema), defaultValues: { type: 'percentage', minOrderValue: 0, userUsageLimit: 1 } });
  const onSubmit = (data: CouponFormValues): void => { createCoupon.mutate(data, { onSuccess: () => reset({ type: 'percentage', minOrderValue: 0, userUsageLimit: 1 }) }); };
  const onArchive = (id: string): void => { if (window.confirm(COPY.common.confirmArchive)) archiveCoupon.mutate(id); };
  return <section className="grid gap-6"><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6 shadow-lg md:grid-cols-3"><h1 className="font-display text-2xl md:col-span-3">{COPY.coupons.form}</h1><Input label={COPY.fields.code} error={formState.errors.code?.message} {...register('code')} /><SelectField label={COPY.fields.type} error={formState.errors.type?.message} options={[{ label: COPY.options.percentage, value: 'percentage' }, { label: COPY.options.fixed, value: 'fixed' }, { label: COPY.options.freeShipping, value: 'freeShipping' }]} {...register('type')} /><Input label={COPY.fields.value} type="number" error={formState.errors.value?.message} {...register('value')} /><Input label={COPY.fields.validFrom} type="date" error={formState.errors.validFrom?.message} {...register('validFrom')} /><Input label={COPY.fields.validUntil} type="date" error={formState.errors.validUntil?.message} {...register('validUntil')} /><Button type="submit" disabled={createCoupon.isPending}>{createCoupon.isPending ? COPY.common.loading : COPY.common.save}</Button>{createCoupon.isSuccess ? <p className="text-sm text-success md:col-span-3">{COPY.coupons.created}</p> : null}{createCoupon.error ? <p className="text-sm text-danger md:col-span-3">{createCoupon.error.message}</p> : null}</form>{!isLoading && coupons.length === 0 ? <EmptyPanel title={COPY.coupons.title} message={COPY.coupons.empty} /> : <div className="overflow-x-auto border border-border bg-background-elevated shadow-lg"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.code}</th><th className="border-b border-border p-4">{COPY.fields.type}</th><th className="border-b border-border p-4">{COPY.fields.value}</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={5}>{COPY.common.loading}</td></tr> : coupons.map((coupon) => <tr key={couponId(coupon)} className="border-b border-border-subtle transition hover:bg-background-overlay/60"><td className="p-4 font-mono text-text-primary">{coupon.code}</td><td className="p-4 text-text-secondary">{COPY.options[coupon.type]}</td><td className="p-4 text-text-secondary">{coupon.value}</td><td className="p-4"><StatusPill tone={coupon.isActive ? 'success' : 'neutral'}>{coupon.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill></td><td className="p-4"><Button variant="danger" onClick={() => onArchive(couponId(coupon))}>{COPY.common.archive}</Button></td></tr>)}</tbody></table></div>}</section>;
}
