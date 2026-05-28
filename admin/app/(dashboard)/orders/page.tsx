// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { OrderManager } from '@/components/dashboard/order-manager';
import { useAdminOrders } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const orders = useAdminOrders(); return <OrderManager orders={orders.data ?? []} isLoading={orders.isLoading} />; }
