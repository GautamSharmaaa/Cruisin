// Governed by .rules v1.0
'use client';

import { Heart, Home, Search, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface BottomNavProps { onSearch: () => void; }

export function BottomNav({ onSearch }: BottomNavProps): ReactNode {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const { openMobileAuth } = useMobileAuthSheet();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const downwardDistanceRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const TOP_REVEAL_POSITION = 16;
    const HIDE_DISTANCE = 18;
    const REVEAL_DISTANCE = 3;
    let animationFrame = 0;

    const reveal = (): void => {
      downwardDistanceRef.current = 0;
      setIsHidden(false);
    };
    const hide = (): void => setIsHidden(true);
    const updateFromScroll = (): void => {
      animationFrame = 0;
      const nextScrollY = Math.max(0, window.scrollY);
      const delta = nextScrollY - lastScrollYRef.current;

      if (nextScrollY <= TOP_REVEAL_POSITION) {
        reveal();
      } else if (delta <= -REVEAL_DISTANCE) {
        reveal();
      } else if (delta > 0) {
        downwardDistanceRef.current += delta;
        if (downwardDistanceRef.current >= HIDE_DISTANCE) hide();
      }

      lastScrollYRef.current = nextScrollY;
    };
    const onScroll = (): void => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateFromScroll);
    };
    const onTouchStart = (event: TouchEvent): void => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent): void => {
      const currentY = event.touches[0]?.clientY;
      const startY = touchStartYRef.current;
      if (currentY === undefined || startY === null) return;
      const distance = currentY - startY;
      if (distance >= REVEAL_DISTANCE) {
        reveal();
        touchStartYRef.current = currentY;
      } else if (distance <= -HIDE_DISTANCE && window.scrollY > TOP_REVEAL_POSITION) {
        hide();
        touchStartYRef.current = currentY;
      }
    };
    const onTouchEnd = (): void => {
      touchStartYRef.current = null;
    };

    lastScrollYRef.current = Math.max(0, window.scrollY);
    reveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [pathname]);

  return <>
    <nav aria-label="Mobile navigation" aria-hidden={isHidden} inert={isHidden ? true : undefined} data-scroll-state={isHidden ? 'hidden' : 'visible'} className={'fixed inset-x-4 bottom-4 z-40 grid h-14 grid-cols-5 border border-border bg-background-primary/85 shadow-lg backdrop-blur-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:hidden ' + (isHidden ? 'pointer-events-none translate-y-[calc(100%+2rem)] opacity-0' : 'translate-y-0 opacity-100')}>
      <Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.home} href={ROUTES.home}><Home size={18} /></Link>
      <Link className="flex items-center justify-center text-text-secondary transition hover:text-accent-gold active:scale-[0.98]" aria-label={COPY.shop.title} href={ROUTES.shop}><Store data-shop-all-mark aria-hidden="true" size={20} strokeWidth={1.35} /></Link>
      <button className="flex items-center justify-center text-accent-gold transition active:scale-[0.98]" aria-label={COPY.nav.search} onClick={onSearch}><Search size={18} /></button>
      <button type="button" className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.wishlist} onClick={() => user ? window.location.assign(ROUTES.wishlist) : openMobileAuth({ next: ROUTES.wishlist })}><Heart size={18} /></button>
      {user ? <Link className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.nav.account} href={ROUTES.account}><User size={18} /></Link> : <button type="button" className="flex items-center justify-center text-text-secondary transition active:scale-[0.98]" aria-label={COPY.auth.whatsapp.continue} onClick={() => openMobileAuth({ next: pathname })}><User size={18} /></button>}
    </nav>
  </>;
}
