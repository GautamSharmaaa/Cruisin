// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { COPY } from '@/constants/copy';
import { useAdminCoupons } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const coupons = useAdminCoupons(); return <ResourceTable title={COPY.nav.discounts} items={coupons.data ?? []} isLoading={coupons.isLoading} />; }
