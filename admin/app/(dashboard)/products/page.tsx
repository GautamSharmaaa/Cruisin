// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { COPY } from '@/constants/copy';
import { useAdminProducts } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const products = useAdminProducts(); return <ResourceTable title={COPY.products.title} items={products.data ?? []} isLoading={products.isLoading} />; }
