// Governed by .rules v1.0
'use client';

import { Heart, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AccountMenu } from '@/components/layout/account-menu';
import { SearchModal } from '@/components/shared/search-modal';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useNavigation, useSiteSettings } from '@/hooks/useMerchandising';
import { navReveal } from '@/lib/animations';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { NavigationItemDto } from '@/types/dto.types';

export interface NavbarProps { }

const navId = (item: NavigationItemDto): string => item._id ?? item.id ?? item.slug;

export function Navbar(_props: NavbarProps): ReactNode {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const navigation = useNavigation();
  const siteSettings = useSiteSettings();
  const isNavigationVisible = siteSettings.data?.isStorefrontNavigationVisible ?? true;
  const navItems = useMemo(() => (isNavigationVisible ? (navigation.data ?? []).filter((item) => item.isVisible) : []), [isNavigationVisible, navigation.data]);
  const activeItem = navItems.find((item) => navId(item) === activeId) ?? null;
  const defaultMenuItem = useMemo(() => {
    const routeItem = navItems.find((item) => item.href !== '/' && pathname.startsWith(item.href) && item.isMegaMenuEnabled);
    return routeItem ?? navItems.find((item) => item.isDefaultActive && item.isMegaMenuEnabled) ?? navItems.find((item) => item.isMegaMenuEnabled) ?? navItems[0] ?? null;
  }, [navItems, pathname]);
  const items = useCartStore((state) => state.items);
  const cartCount = items.filter((item) => isCustomerVisibleProduct(item.product)).length;
  const openCart = useCartStore((state) => state.openCart);
  const wishlistCount = useWishlistStore((state) => state.ids.length);

  const openMenu = (): void => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      if (activeId) {
        setActiveId(null);
        return;
      }
      if (defaultMenuItem) setActiveId(navId(defaultMenuItem));
      return;
    }
    if (mobile) {
      setMobile(false);
      return;
    }
    setMobile(true);
  };

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setActiveId(null);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearch(true);
      }
    };
    const onPointer = (event: MouseEvent): void => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setActiveId(null);
    };
    window.addEventListener('scroll', onScroll);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  useEffect(() => {
    setActiveId(null);
    setMobile(false);
  }, [pathname]);

  return (
    <motion.header ref={headerRef} variants={navReveal} initial="initial" animate="animate" className={'fixed inset-x-0 top-0 z-[100] transition-all duration-500 ' + (scrolled || activeId || mobile ? 'border-b border-border-subtle bg-background-primary/95 shadow-lg backdrop-blur-2xl' : 'bg-gradient-to-b from-background-primary/80 to-background-primary/20 backdrop-blur-sm')}>
      <a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>
      <div className="relative z-[90] grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {navItems.length > 0 ? <AnimatedMenuButton open={Boolean(activeId) || mobile} onClick={openMenu} /> : null}
        </div>
        <Link href={ROUTES.home} className="min-w-0 text-center font-display text-xl leading-none text-text-primary transition duration-300 hover:text-accent-gold lg:text-2xl">
          <span className="block leading-none">{COPY.brand.name}</span>
          <span className="mt-1 hidden font-accent text-[9px] uppercase tracking-[0.2em] text-text-muted xl:block">{COPY.brand.tagline}</span>
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-1 md:gap-2">
          <button aria-label={COPY.nav.search} className="hidden h-11 w-11 shrink-0 items-center justify-center text-text-secondary transition hover:bg-background-elevated hover:text-text-primary md:flex" onClick={() => { setActiveId(null); setMobile(false); setSearch(true); }}><Search size={18} /></button>
          <Link aria-label={COPY.nav.wishlist} href={ROUTES.wishlist} className="relative hidden h-11 w-11 shrink-0 items-center justify-center text-text-secondary transition hover:bg-background-elevated hover:text-accent-gold md:flex">
            <Heart size={18} fill={wishlistCount > 0 ? 'currentColor' : 'none'} />
            {wishlistCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{wishlistCount}</span> : null}
          </Link>
          <AccountMenu />
          <button aria-label={COPY.nav.cart} className="relative flex h-11 w-11 shrink-0 items-center justify-center text-text-primary transition hover:bg-background-elevated hover:text-accent-gold" onClick={() => { setActiveId(null); setMobile(false); openCart(); }}>
            <ShoppingBag size={18} />
            {cartCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{cartCount}</span> : null}
          </button>
        </div>
      </div>
      <MegaMenu
        items={navItems}
        activeItem={activeItem}
        activeId={activeId}
        onActiveChange={setActiveId}
        onClose={() => setActiveId(null)}
      />
      <MobileNav
        open={mobile}
        onOpenChange={setMobile}
        items={navItems}
        onSearch={() => setSearch(true)}
        onCart={openCart}
        cartCount={cartCount}
      />
      <SearchModal open={search} onOpenChange={setSearch} />
    </motion.header>
  );
}

function AnimatedMenuButton({ open, onClick }: { open: boolean; onClick: () => void }): ReactNode {
  return (
    <button
      type="button"
      aria-label={COPY.nav.menu}
      aria-expanded={open}
      onClick={onClick}
      className="group relative flex h-11 w-11 items-center justify-center text-text-primary transition duration-300 hover:text-accent-gold"
    >
      <span className="sr-only">{COPY.nav.menu}</span>
      <span className="relative block h-4 w-6">
        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-0 h-px w-6 bg-current"
          animate={open ? { y: 7, rotate: 45, width: 24 } : { y: 0, rotate: 0, width: 24 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-[7px] h-px w-4 bg-current"
          animate={open ? { opacity: 0, x: 8, width: 0 } : { opacity: 1, x: 0, width: 16 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-6 bg-current"
          animate={open ? { y: -7, rotate: -45, width: 24 } : { y: 0, rotate: 0, width: 24 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </span>
      <span className="absolute inset-0 scale-75 border border-accent-gold/0 opacity-0 transition duration-300 group-hover:scale-100 group-hover:border-accent-gold/35 group-hover:opacity-100" />
    </button>
  );
}
