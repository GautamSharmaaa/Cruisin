// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CouponManager } from '@/components/dashboard/coupon-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { COPY } from '@/constants/copy';
import { useAdminCoupons } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const coupons = useAdminCoupons(); return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.coupons.title} subtitle={COPY.coupons.subtitle} /><CouponManager coupons={coupons.data ?? []} isLoading={coupons.isLoading} />{coupons.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>; }
