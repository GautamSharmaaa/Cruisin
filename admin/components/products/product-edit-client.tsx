// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ProductForm } from '@/components/products/product-form';
import { COPY } from '@/constants/copy';
import { useAdminProduct } from '@/hooks/useAdminResources';

export interface ProductEditClientProps {
  id: string;
}

export function ProductEditClient({ id }: ProductEditClientProps): ReactNode {
  const product = useAdminProduct(id);
  return <section><h1 className="mb-6 font-display text-3xl">{COPY.products.edit}</h1>{product.isLoading ? <p className="text-sm text-text-secondary">{COPY.common.loading}</p> : <ProductForm product={product.data} />}</section>;
}
