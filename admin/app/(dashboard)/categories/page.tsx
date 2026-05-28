// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { COPY } from '@/constants/copy';
import { useAdminCategories } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const categories = useAdminCategories(); return <ResourceTable title={COPY.nav.categories} items={categories.data ?? []} isLoading={categories.isLoading} />; }
