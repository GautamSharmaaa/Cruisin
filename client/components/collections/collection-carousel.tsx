// Governed by .rules v1.0
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { isCustomerVisibleText } from '@/lib/customer-state';
import type { CollectionDto } from '@/types/dto.types';

export interface CollectionCarouselProps {
  collections: CollectionDto[];
  activeSlug?: string;
}

export function CollectionCarousel({ collections, activeSlug }: CollectionCarouselProps): ReactNode {
  const visibleCollections = collections.filter((collection) => isCustomerVisibleText([collection.title, collection.slug, collection.description ?? ''].join(' ')));
  if (visibleCollections.length === 0) return null;
  return <div className="overflow-x-auto pb-3 [scrollbar-width:none]"><div className="flex gap-4">{visibleCollections.map((collection) => { const image = collection.thumbnailImage || collection.heroImage || collection.bannerImage || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85'; const active = activeSlug === collection.slug; return <Link key={collection._id ?? collection.id ?? collection.slug} href={'/collections/' + collection.slug} className={(active ? 'border-accent-gold' : 'border-border-subtle') + ' group relative h-64 w-52 shrink-0 overflow-hidden rounded-md border bg-background-elevated md:w-72'}><Image src={image} alt={collection.title} fill sizes="(min-width:768px) 288px, 208px" className="object-cover opacity-85 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100" /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background-primary to-transparent p-4 font-display text-2xl text-text-primary">{collection.title}</span></Link>; })}</div></div>;
}
