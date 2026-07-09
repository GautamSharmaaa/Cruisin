// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Gift, Percent, ShieldCheck, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { AdminCard, AdminDataTable, AdminFormSection, AdminSectionHeader, AdminStat, AdminStatsGrid, EmptyState } from '@/components/dashboard/admin-ui';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useArchiveCoupon, useCreateCoupon } from '@/hooks/useAdminMutations';
import { useAdminCategories, useAdminProducts } from '@/hooks/useAdminResources';
import { adminCouponSchema } from '@/lib/schemas';
import { formatPrice } from '@/lib/utils';
import type { CategoryDto, CouponDto, ProductDto } from '@/types/dto.types';

export interface CouponManagerProps {
  coupons: CouponDto[];
  isLoading: boolean;
}

type CouponFormValues = z.infer<typeof adminCouponSchema>;

const couponId = (coupon: CouponDto): string => coupon.id ?? coupon._id ?? coupon.code;
const itemId = (item: { id?: string; _id?: string; slug?: string }): string => item.id ?? item._id ?? item.slug ?? '';
const ids = (items?: Array<string | ProductDto | CategoryDto>): string[] => (items ?? []).map((item) => typeof item === 'string' ? item : itemId(item)).filter(Boolean);

export function CouponManager({ coupons, isLoading }: CouponManagerProps): ReactNode {
  const createCoupon = useCreateCoupon();
  const archiveCoupon = useArchiveCoupon();
  const products = useAdminProducts({ limit: 100, sort: 'updated' });
  const categories = useAdminCategories();
  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<CouponFormValues>({ resolver: zodResolver(adminCouponSchema), defaultValues: { type: 'percentage', minOrderValue: 0, userUsageLimit: 1, applicableProducts: '', applicableCategories: '' } });

  const selectedProducts = watch('applicableProducts') ?? '';
  const selectedCategories = watch('applicableCategories') ?? '';
  const productTargetCount = selectedProducts.split(',').map((item) => item.trim()).filter(Boolean).length;
  const categoryTargetCount = selectedCategories.split(',').map((item) => item.trim()).filter(Boolean).length;

  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((coupon) => coupon.isActive).length,
    targeted: coupons.filter((coupon) => ids(coupon.applicableProducts).length || ids(coupon.applicableCategories).length).length,
    used: coupons.reduce((sum, coupon) => sum + (coupon.usedCount ?? 0), 0)
  }), [coupons]);

  const onSubmit = (data: CouponFormValues): void => { createCoupon.mutate(data, { onSuccess: () => reset({ type: 'percentage', minOrderValue: 0, userUsageLimit: 1, applicableProducts: '', applicableCategories: '' }) }); };
  const onArchive = (id: string): void => { if (window.confirm(COPY.common.confirmArchive)) archiveCoupon.mutate(id); };
  const updateCsvSelection = (field: 'applicableProducts' | 'applicableCategories', id: string, checked: boolean): void => {
    const current = (watch(field) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const next = checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id);
    setValue(field, next.join(', '), { shouldDirty: true, shouldValidate: true });
  };

  return <section className="grid min-w-0 gap-6">
    <AdminStatsGrid>
      <AdminStat label="Coupons" value={stats.total} />
      <AdminStat label="Active" value={stats.active} tone="success" />
      <AdminStat label="Targeted" value={stats.targeted} tone="gold" />
      <AdminStat label="Total uses" value={stats.used} />
    </AdminStatsGrid>

    <form onSubmit={handleSubmit(onSubmit)} className="grid min-w-0 gap-6">
      <AdminFormSection title="Campaign Basics" description="Create coupon rules that checkout and cart validation enforce." columns={3}>
        <Input label={COPY.fields.code} error={formState.errors.code?.message} {...register('code')} />
        <SelectField label={COPY.fields.type} error={formState.errors.type?.message} options={[{ label: COPY.options.percentage, value: 'percentage' }, { label: COPY.options.fixed, value: 'fixed' }, { label: COPY.options.freeShipping, value: 'freeShipping' }]} {...register('type')} />
        <Input label={COPY.fields.value} type="number" error={formState.errors.value?.message} {...register('value')} />
        <Input label="Minimum cart value" type="number" error={formState.errors.minOrderValue?.message} {...register('minOrderValue')} />
        <Input label="Maximum discount" type="number" error={formState.errors.maxDiscount?.message} {...register('maxDiscount')} />
        <Input label="Total usage limit" type="number" error={formState.errors.usageLimit?.message} {...register('usageLimit')} />
        <Input label="Usage per customer" type="number" error={formState.errors.userUsageLimit?.message} {...register('userUsageLimit')} />
        <Input label={COPY.fields.validFrom} type="date" error={formState.errors.validFrom?.message} {...register('validFrom', { setValueAs: (value) => typeof value === 'string' ? value : '' })} />
        <Input label={COPY.fields.validUntil} type="date" error={formState.errors.validUntil?.message} {...register('validUntil', { setValueAs: (value) => typeof value === 'string' ? value : '' })} />
      </AdminFormSection>

      <AdminCard className="grid gap-5">
        <AdminSectionHeader eyebrow="Targeting" title="Eligible products and categories" description="Leave both empty for all products. If targets are selected, checkout discounts only the matching product/category subtotal." />
        <div className="grid gap-4 xl:grid-cols-2">
          <TargetPicker title="Products" helper={productTargetCount + ' selected'}>{(products.data?.items ?? []).map((product) => { const id = itemId(product); return <Toggle key={id} label={product.title + ' / ' + (product.variants?.[0]?.sku ?? product.slug)} value={selectedProducts.split(',').map((item) => item.trim()).includes(id)} onChange={(checked) => updateCsvSelection('applicableProducts', id, checked)} />; })}</TargetPicker>
          <TargetPicker title="Categories" helper={categoryTargetCount + ' selected'}>{(categories.data ?? []).map((category) => { const id = itemId(category); return <Toggle key={id} label={category.path ?? category.name} value={selectedCategories.split(',').map((item) => item.trim()).includes(id)} onChange={(checked) => updateCsvSelection('applicableCategories', id, checked)} />; })}</TargetPicker>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background-primary p-4">
          <p className="text-sm text-text-secondary"><ShieldCheck size={16} className="mr-2 inline text-accent-gold" />Eligibility preview: {productTargetCount || categoryTargetCount ? productTargetCount + ' products and ' + categoryTargetCount + ' categories selected.' : 'Coupon applies to all products.'}</p>
          <Button type="button" onClick={() => void handleSubmit(onSubmit)()} disabled={createCoupon.isPending}>{createCoupon.isPending ? COPY.common.loading : COPY.common.save}</Button>
        </div>
        {createCoupon.isSuccess ? <p className="text-sm text-success">{COPY.coupons.created}</p> : null}
        {createCoupon.error ? <p className="text-sm text-danger">{createCoupon.error.message}</p> : null}
      </AdminCard>
    </form>

    {!isLoading && coupons.length === 0 ? <EmptyState title={COPY.coupons.title} message={COPY.coupons.empty} /> : <AdminDataTable minWidth={1040}>
      <thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.code}</th><th className="border-b border-border p-4">Rule</th><th className="border-b border-border p-4">Targeting</th><th className="border-b border-border p-4">Limits</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead>
      <tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={6}>{COPY.common.loading}</td></tr> : coupons.map((coupon) => {
        const productCount = ids(coupon.applicableProducts).length;
        const categoryCount = ids(coupon.applicableCategories).length;
        return <tr key={couponId(coupon)} className="border-b border-border-subtle transition hover:bg-background-overlay/60">
          <td className="p-4"><p className="font-mono text-text-primary">{coupon.code}</p><p className="mt-2 text-xs text-text-muted">{coupon.validFrom ? new Date(coupon.validFrom).toLocaleDateString('en-IN') : 'Start'} - {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString('en-IN') : 'End'}</p></td>
          <td className="p-4 text-text-secondary"><p className="flex items-center gap-2 text-text-primary">{coupon.type === 'percentage' ? <Percent size={15} /> : <Gift size={15} />}{COPY.options[coupon.type]} · {coupon.type === 'percentage' ? coupon.value + '%' : formatPrice(coupon.value)}</p><p className="mt-1 text-xs">Min {formatPrice(coupon.minOrderValue ?? 0)} · Max {coupon.maxDiscount ? formatPrice(coupon.maxDiscount) : 'No cap'}</p></td>
          <td className="p-4 text-text-secondary">{productCount || categoryCount ? productCount + ' products / ' + categoryCount + ' categories' : 'All products'}</td>
          <td className="p-4 text-text-secondary">{coupon.usedCount ?? 0} used{coupon.usageLimit ? ' of ' + coupon.usageLimit : ''}<p className="mt-1 text-xs">Per customer {coupon.userUsageLimit ?? 1}</p></td>
          <td className="p-4"><StatusPill tone={coupon.isActive ? 'success' : 'neutral'}>{coupon.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill></td>
          <td className="p-4"><Button variant="danger" onClick={() => onArchive(couponId(coupon))}><Archive size={15} className="mr-2" />{COPY.common.archive}</Button></td>
        </tr>;
      })}</tbody>
    </AdminDataTable>}
  </section>;
}

function TargetPicker({ title, helper, children }: { title: string; helper: string; children: ReactNode }): ReactNode {
  return <div className="grid gap-3 border border-border bg-background-primary p-4">
    <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-text-muted">{title}</p><p className="text-xs text-accent-gold">{helper}</p></div>
    <div className="grid max-h-72 gap-2 overflow-auto pr-1">{children}</div>
  </div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactNode {
  return <label className="flex min-h-11 min-w-0 items-center gap-3 border border-border px-3 text-sm text-text-secondary"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-accent-gold" /><span className="min-w-0 truncate">{label}</span></label>;
}
