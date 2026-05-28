// Governed by .rules v1.0
import Image from 'next/image';
import type { ReactNode } from 'react';
import { PRODUCTS } from '@/constants/catalog';
import { COPY } from '@/constants/copy';

export interface InstagramSectionProps { }
export function InstagramSection(_props: InstagramSectionProps): ReactNode { return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl text-text-primary">{COPY.home.instagram}</h2><div className="grid grid-cols-2 gap-px md:grid-cols-4">{PRODUCTS.map((product) => <div key={product.id} className="relative aspect-square overflow-hidden"><Image src={product.images[0].url} alt={product.images[0].alt} fill sizes="25vw" className="object-cover" /></div>)}</div></section>; }
