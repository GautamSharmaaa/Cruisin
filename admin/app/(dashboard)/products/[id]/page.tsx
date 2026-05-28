// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductForm } from '@/components/products/product-form';
import { COPY } from '@/constants/copy';
export interface ProductEditPageProps { params: Promise<{ id: string }>; }
export default async function ProductEditPage(_props: ProductEditPageProps): Promise<ReactNode> { return <section><h1 className="mb-6 font-display text-3xl">{COPY.products.form}</h1><ProductForm /></section>; }
