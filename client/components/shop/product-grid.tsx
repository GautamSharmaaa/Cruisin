// Governed by .rules v1.0
'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ProductCard } from '@/components/shop/product-card';
import { staggerContainer } from '@/lib/animations';
import type { Product } from '@/types/product.types';

export interface ProductGridProps { products: Product[]; }
export function ProductGrid({ products }: ProductGridProps): ReactNode { return <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-px xl:grid-cols-3 2xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</motion.div>; }
