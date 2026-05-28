// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductEditClient } from '@/components/products/product-edit-client';
export interface ProductEditPageProps { params: Promise<{ id: string }>; }
export default async function ProductEditPage({ params }: ProductEditPageProps): Promise<ReactNode> { const { id } = await params; return <ProductEditClient id={id} />; }
