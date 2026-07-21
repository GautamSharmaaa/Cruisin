// Governed by .rules v1.0
'use client';

import { Heart, Home, Search, Store, User } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface BottomNavProps { onSearch: () => void; }

export function BottomNav({ onSearch }: BottomNavProps): ReactNode {
  const user = useAuthStore((state) => state.user);
  const [wishlistPrompt, setWishlistPrompt] = useState(false);

  return <>
    <nav aria-label="Mobile navigation" className="fixed inset-x-4 bottom-4 z-40 grid h-14 grid-cols-5 border border-border bg-background-primary/85 shadow-lg backdrop-blur-2xl md:hidden">
      <Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.home} href={ROUTES.home}><Home size={18} /></Link>
      <Link className="flex items-center justify-center text-text-secondary transition hover:text-accent-gold active:scale-[0.98]" aria-label={COPY.shop.title} href={ROUTES.shop}><Store data-shop-all-mark aria-hidden="true" size={20} strokeWidth={1.35} /></Link>
      <button className="flex items-center justify-center text-accent-gold transition active:scale-[0.98]" aria-label={COPY.nav.search} onClick={onSearch}><Search size={18} /></button>
      <button type="button" className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.wishlist} onClick={() => user ? window.location.assign(ROUTES.wishlist) : setWishlistPrompt(true)}><Heart size={18} /></button>
      <Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={user ? COPY.nav.account : COPY.auth.signIn} href={user ? ROUTES.account : ROUTES.login}><User size={18} /></Link>
    </nav>
    <LoginRequiredModal open={wishlistPrompt} onOpenChange={setWishlistPrompt} next={ROUTES.wishlist} action="wishlist" />
  </>;
}
