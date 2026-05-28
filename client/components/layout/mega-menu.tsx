// Governed by .rules v1.0
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COLLECTIONS } from '@/constants/catalog';

export interface MegaMenuProps { open: boolean; }
export function MegaMenu({ open }: MegaMenuProps): ReactNode { if (!open) return null; return <div className="absolute left-0 top-16 w-full border-y border-border bg-background-elevated/95 p-8 backdrop-blur-xl"><div className="mx-auto grid max-w-[1440px] gap-px md:grid-cols-3">{COLLECTIONS.map((collection) => <Link key={collection.href} href={collection.href} className="group relative aspect-[4/3] overflow-hidden"><Image src={collection.image.url} alt={collection.image.alt} fill sizes="33vw" className="object-cover opacity-80 transition group-hover:scale-[1.04]" /><span className="absolute bottom-4 left-4 font-display text-xl text-text-primary">{collection.title}</span></Link>)}</div></div>; }
