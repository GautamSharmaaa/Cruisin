// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CouponManager } from '@/components/dashboard/coupon-manager';
import { useAdminCoupons } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const coupons = useAdminCoupons(); return <CouponManager coupons={coupons.data ?? []} isLoading={coupons.isLoading} />; }
