// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { COPY } from '@/constants/copy';
import { useAdminOrders } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const orders = useAdminOrders(); return <ResourceTable title={COPY.orders.title} items={orders.data ?? []} isLoading={orders.isLoading} />; }
