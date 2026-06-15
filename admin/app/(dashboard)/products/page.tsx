// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ProductManager } from '@/components/products/product-manager';
import { COPY } from '@/constants/copy';
import { useAdminProducts } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const products = useAdminProducts(); return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.products.title} subtitle={COPY.products.subtitle} /><ProductManager products={products.data ?? []} isLoading={products.isLoading} />{products.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>; }
