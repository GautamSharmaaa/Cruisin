// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductGrid } from '@/components/shop/product-grid';
import { PRODUCTS } from '@/constants/catalog';
import { COPY } from '@/constants/copy';

export interface NewArrivalsProps { }
export function NewArrivals(_props: NewArrivalsProps): ReactNode { return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl text-text-primary">{COPY.home.newArrivals}</h2><ProductGrid products={PRODUCTS} /></section>; }
