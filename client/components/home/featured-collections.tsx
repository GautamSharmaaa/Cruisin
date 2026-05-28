// Governed by .rules v1.0
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COLLECTIONS } from '@/constants/catalog';
import { COPY } from '@/constants/copy';

export interface FeaturedCollectionsProps { }
export function FeaturedCollections(_props: FeaturedCollectionsProps): ReactNode { return <section className="px-6 py-20 lg:px-20 lg:py-32"><h2 className="mb-12 font-display text-3xl text-text-primary">{COPY.home.featured}</h2><div className="grid gap-px md:grid-cols-3">{COLLECTIONS.map((collection) => <Link key={collection.href} href={collection.href} className="group relative aspect-[3/4] overflow-hidden bg-background-elevated"><Image src={collection.image.url} alt={collection.image.alt} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" /><div className="absolute inset-x-0 bottom-0 bg-hero p-6"><h3 className="font-display text-2xl text-text-primary">{collection.title}</h3></div></Link>)}</div></section>; }
