// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ProductManager } from '@/components/products/product-manager';
import { useAdminProducts } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const products = useAdminProducts(); return <ProductManager products={products.data ?? []} isLoading={products.isLoading} />; }
