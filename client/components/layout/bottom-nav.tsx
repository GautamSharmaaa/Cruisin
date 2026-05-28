// Governed by .rules v1.0
'use client';

import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export interface BottomNavProps { onSearch: () => void; }
export function BottomNav({ onSearch }: BottomNavProps): ReactNode { return <nav className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 border-t border-border bg-background-elevated md:hidden"><Link className="flex items-center justify-center" aria-label={COPY.nav.home} href={ROUTES.home}><Home size={18} /></Link><Link className="flex items-center justify-center" aria-label={COPY.nav.shop} href={ROUTES.shop}><ShoppingBag size={18} /></Link><button className="flex items-center justify-center" aria-label={COPY.nav.search} onClick={onSearch}><Search size={18} /></button><Link className="flex items-center justify-center" aria-label={COPY.nav.wishlist} href={ROUTES.wishlist}><Heart size={18} /></Link><Link className="flex items-center justify-center" aria-label={COPY.nav.account} href={ROUTES.account}><User size={18} /></Link></nav>; }
