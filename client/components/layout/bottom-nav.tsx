// Governed by .rules v1.0
'use client';

import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface BottomNavProps { onSearch: () => void; }
export function BottomNav({ onSearch }: BottomNavProps): ReactNode { const user = useAuthStore((state) => state.user); return <nav className="fixed inset-x-4 bottom-4 z-40 grid h-14 grid-cols-5 border border-border bg-background-primary/85 shadow-lg backdrop-blur-2xl md:hidden"><Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.home} href={ROUTES.home}><Home size={18} /></Link><Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.shop} href={ROUTES.shop}><ShoppingBag size={18} /></Link><button className="flex items-center justify-center text-accent-gold transition active:scale-[0.98]" aria-label={COPY.nav.search} onClick={onSearch}><Search size={18} /></button><Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.wishlist} href={user ? ROUTES.wishlist : ROUTES.login}><Heart size={18} /></Link><Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={user ? COPY.nav.account : COPY.auth.signIn} href={user ? ROUTES.account : ROUTES.login}><User size={18} /></Link></nav>; }
