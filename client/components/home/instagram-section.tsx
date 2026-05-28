// Governed by .rules v1.0
'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { useProducts } from '@/hooks/useProducts';

export interface InstagramSectionProps { }
export function InstagramSection(_props: InstagramSectionProps): ReactNode { const products = useProducts({ limit: 4 }); const items = products.data?.items ?? []; return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl text-text-primary">{COPY.home.instagram}</h2><div className="grid grid-cols-2 gap-px md:grid-cols-4">{items.map((product) => <div key={product.id} className="relative aspect-square overflow-hidden"><Image src={product.images[0].url} alt={product.images[0].alt} fill sizes="25vw" className="object-cover" /></div>)}</div></section>; }
