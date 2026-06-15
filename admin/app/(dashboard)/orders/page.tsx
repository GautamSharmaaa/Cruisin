// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { OrderManager } from '@/components/dashboard/order-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { COPY } from '@/constants/copy';
import { useAdminOrders } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const orders = useAdminOrders(); return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.orders.title} subtitle={COPY.orders.subtitle} /><OrderManager orders={orders.data ?? []} isLoading={orders.isLoading} />{orders.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>; }
