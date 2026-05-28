// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CategoryManager } from '@/components/dashboard/category-manager';
import { useAdminCategories } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const categories = useAdminCategories(); return <CategoryManager categories={categories.data ?? []} isLoading={categories.isLoading} />; }
