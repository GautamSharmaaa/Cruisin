// Governed by .rules v1.0
'use client';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {DEPARTMENT_COPY} from '@/constants/department-copy';
import {storefrontNavigation} from '@/lib/storefront-navigation';

import { createLucideIcon, Heart, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AccountMenu } from '@/components/layout/account-menu';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { SearchModal } from '@/components/shared/search-modal';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useNavigation, useSiteSettings, useStorefrontLinks } from '@/hooks/useMerchandising';
import { headerScrollMotion } from '@/lib/animations';
import { storefrontLayoutScrollEvent } from '@/lib/storefront-motion';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';

export interface NavbarProps { }

const StorefrontBag = createLucideIcon('StorefrontBag', [
  ['path', { d: 'M6 8.5h12l1.65 11.6a1.5 1.5 0 0 1-1.49 1.7H5.84a1.5 1.5 0 0 1-1.49-1.7L6 8.5Z', key: 'body' }],
  ['path', { d: 'M8.8 11V6a3.2 3.2 0 0 1 6.4 0v5', key: 'handle' }],
]);
const StorefrontMenu = createLucideIcon('StorefrontMenu', [
  ['path', { d: 'M3 8h18M3 16h18', key: 'lines' }],
]);

export function Navbar(_props: NavbarProps): ReactNode {
  const experience=useStorefrontExperience();
  const [scrollState, setScrollState] = useState({ scrolled: false, hidden: false });
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [wishlistPrompt, setWishlistPrompt] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isHomepage = pathname === ROUTES.home;
  const navigation = useNavigation();
  const siteSettings = useSiteSettings();
  const links = useStorefrontLinks();
  const showDepartmentLinks=links.headerDepartmentLinksVisibility==='all'||(links.headerDepartmentLinksVisibility==='home'&&isHomepage);
  const isNavigationVisible = siteSettings.data?.isStorefrontNavigationVisible ?? true;
  const navItems = useMemo(() => (isNavigationVisible ? storefrontNavigation(navigation.data ?? []) : []), [isNavigationVisible, navigation.data]);
  const items = useCartStore((state) => state.items);
  const cartCount = items.filter((item) => isCustomerVisibleProduct(item.product)).reduce((count,item)=>count+item.quantity,0);
  const openCart = useCartStore((state) => state.openCart);
  const wishlistCount = useWishlistStore((state) => state.ids.length);
  const user = useAuthStore((state) => state.user);

  const headerHidden = experience.hideHeaderOnScroll && scrollState.hidden && !mobile && !search && !wishlistPrompt;

  useEffect(() => {
    let previousY = Math.max(0, window.scrollY);
    let distance = 0;
    let frame = 0;
    let scrolled = previousY > 8;
    let hidden = false;
    setScrollState({ scrolled, hidden });

    const commit = (y: number, nextHidden: boolean): void => {
      const nextScrolled = y > 8;
      if (nextScrolled !== scrolled || nextHidden !== hidden) {
        scrolled = nextScrolled;
        hidden = nextHidden;
        setScrollState({ scrolled, hidden });
      }
    };
    const update = (): void => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - previousY;
      previousY = y;
      if (delta === 0) return;

      distance = Math.sign(delta) === Math.sign(distance) ? distance + delta : delta;
      let nextHidden = hidden;
      if (y <= headerScrollMotion.hideAfter || distance <= -headerScrollMotion.upDistance) nextHidden = false;
      else if (distance >= headerScrollMotion.downDistance) nextHidden = true;
      commit(y, nextHidden);
    };

    const syncLayoutScroll = (): void => {
      previousY = Math.max(0, window.scrollY);
      distance = 0;
      commit(previousY, hidden && previousY > headerScrollMotion.hideAfter);
    };
    const schedule = (): void => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener(storefrontLayoutScrollEvent, syncLayoutScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener(storefrontLayoutScrollEvent, syncLayoutScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMobile(false);
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setMobile(false), [pathname]);

  return (
    <header className="editorial-navbar" data-hidden={headerHidden} data-landing={isHomepage} data-department-links={showDepartmentLinks && isNavigationVisible} data-overlay={(isHomepage || pathname.startsWith('/cms-preview')) && !scrollState.scrolled && !mobile}>
      <a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>
      <div className="editorial-navbar-main">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {navItems.length > 0 ? <MenuButton open={mobile} onClick={() => setMobile(current => !current)} /> : null}
          <button type="button" aria-label={COPY.nav.search} className="editorial-header-icon" onClick={()=>{setMobile(false);setSearch(true);}}><Search className="storefront-header-glyph" size={24} strokeWidth={1.5}/></button>
        </div>
        <Link href={links.brandHref} className="cruisin-wordmark brand-wordmark-script cruisin-wordmark-cursive">
          <span className="block leading-none">{COPY.brand.name}</span>
          <span className="sr-only">{COPY.brand.tagline}</span>
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-1 md:gap-2">
          {experience.wishlistEnabled&&<button type="button" aria-label={COPY.nav.wishlist} onClick={() => user ? router.push(ROUTES.wishlist) : setWishlistPrompt(true)} className="relative hidden h-11 w-11 shrink-0 items-center justify-center text-current hover:bg-background-elevated md:flex">
            <Heart className="storefront-header-glyph" size={24} strokeWidth={1.5} fill={wishlistCount > 0 ? 'currentColor' : 'none'} />
            {wishlistCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{wishlistCount}</span> : null}
          </button>}
          <AccountMenu />
          <button aria-label={COPY.nav.cart} className="relative flex h-11 w-11 shrink-0 items-center justify-center text-current hover:bg-background-elevated" onClick={() => { setMobile(false); openCart(); }}>
            <StorefrontBag className="storefront-header-glyph" aria-hidden="true" />
            {cartCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{cartCount}</span> : null}
          </button>
        </div>
      </div>
      {showDepartmentLinks&&isNavigationVisible&&<nav className="editorial-header-links editorial-department-entry" aria-label={DEPARTMENT_COPY.choose}>
        {links.landing.map((link, index) => <Fragment key={index}>
          {index > 0 && <span className="collection-category-divider" aria-hidden="true">/</span>}
          <Link href={link.href}>{link.label}</Link>
        </Fragment>)}
      </nav>}

      <MobileNav
        open={mobile}
        onOpenChange={setMobile}
        items={navItems}
      />
      <SearchModal open={search} onOpenChange={setSearch} />
      <LoginRequiredModal open={wishlistPrompt} onOpenChange={setWishlistPrompt} next={ROUTES.wishlist} action="wishlist" />
    </header>
  );
}

function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }): ReactNode {
  const Icon = open ? X : StorefrontMenu;
  return <button type="button" aria-label={COPY.nav.menu} aria-expanded={open} onClick={onClick} className="editorial-header-icon">
    <Icon className="storefront-header-glyph" aria-hidden="true" />
  </button>;
}
