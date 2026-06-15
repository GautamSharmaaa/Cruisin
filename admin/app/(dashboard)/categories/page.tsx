// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CategoryManager } from '@/components/dashboard/category-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { COPY } from '@/constants/copy';
import { useAdminCategories } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const categories = useAdminCategories(); return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.categories.title} subtitle={COPY.categories.subtitle} /><CategoryManager categories={categories.data ?? []} isLoading={categories.isLoading} />{categories.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>; }
