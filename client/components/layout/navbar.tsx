// Governed by .rules v1.0
'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {DEPARTMENT_COPY} from '@/constants/department-copy';
import {storefrontNavigation,storefrontDepartments} from '@/lib/storefront-navigation';

import { Heart, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AccountMenu } from '@/components/layout/account-menu';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { SearchModal } from '@/components/shared/search-modal';
import { RevolvingBag } from '@/components/shared/revolving-bag';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useNavigation, useSiteSettings } from '@/hooks/useMerchandising';
import { navReveal } from '@/lib/animations';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import type { NavigationItemDto } from '@/types/dto.types';

export interface NavbarProps { }

const navId = (item: NavigationItemDto): string => item._id ?? item.id ?? item.slug;

export function Navbar(_props: NavbarProps): ReactNode {
  const reducedMotion=useStorefrontReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [wishlistPrompt, setWishlistPrompt] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const isHomepage = pathname === ROUTES.home;
  const isProduct = pathname.startsWith('/product/');
  const isCatalogue = ['/shop','/category','/collections','/sale','/new-featured'].some(route=>pathname===route||pathname.startsWith(route+'/'));
  const navigation = useNavigation();
  const siteSettings = useSiteSettings();
  const isNavigationVisible = siteSettings.data?.isStorefrontNavigationVisible ?? true;
  const navItems = useMemo(() => (isNavigationVisible ? storefrontNavigation(navigation.data ?? []) : []), [isNavigationVisible, navigation.data]);
  const activeItem = navItems.find((item) => navId(item) === activeId) ?? null;
  const defaultMenuItem = useMemo(() => {
    const routeItem = navItems.find((item) => item.href !== '/' && pathname.startsWith(item.href) && item.isMegaMenuEnabled);
    return routeItem ?? navItems.find((item) => item.isDefaultActive && item.isMegaMenuEnabled) ?? navItems.find((item) => item.isMegaMenuEnabled) ?? navItems[0] ?? null;
  }, [navItems, pathname]);
  const items = useCartStore((state) => state.items);
  const cartCount = items.filter((item) => isCustomerVisibleProduct(item.product)).reduce((count,item)=>count+item.quantity,0);
  const openCart = useCartStore((state) => state.openCart);
  const wishlistCount = useWishlistStore((state) => state.ids.length);
  const user = useAuthStore((state) => state.user);

  const openMenu = (): void => { setActiveId(null); setMobile(current=>!current); };

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
    <motion.header ref={headerRef} variants={navReveal} initial={reducedMotion?false:"initial"} animate="animate" className="editorial-navbar" data-overlay={(isHomepage||pathname.startsWith('/cms-preview'))&&!scrolled&&!mobile}>
      <a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>
      <div className="editorial-navbar-main">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {navItems.length > 0 ? <AnimatedMenuButton open={mobile} onClick={openMenu} /> : null}
          <button type="button" aria-label={COPY.nav.search} className="editorial-header-icon" onClick={()=>{setMobile(false);setSearch(true);}}><Search size={18}/></button>
        </div>
        <Link href={ROUTES.home} className="cruisin-wordmark brand-wordmark-script cruisin-wordmark-cursive">
          <span className="block leading-none">{COPY.brand.name}</span>
          <span className="sr-only">{COPY.brand.tagline}</span>
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-1 md:gap-2">
          <button type="button" aria-label={COPY.nav.wishlist} onClick={() => user ? window.location.assign(ROUTES.wishlist) : setWishlistPrompt(true)} className="relative hidden h-11 w-11 shrink-0 items-center justify-center text-text-secondary transition hover:bg-background-elevated hover:text-accent-gold md:flex">
            <Heart size={18} fill={wishlistCount > 0 ? 'currentColor' : 'none'} />
            {wishlistCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{wishlistCount}</span> : null}
          </button>
          <AccountMenu />
          <button aria-label={COPY.nav.cart} className="relative flex h-11 w-11 shrink-0 items-center justify-center text-text-primary transition hover:bg-background-elevated hover:text-accent-gold" onClick={() => { setActiveId(null); setMobile(false); openCart(); }}>
            <ShoppingBag size={19} strokeWidth={1.3}/>
            {cartCount > 0 ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse shadow-gold">{cartCount}</span> : null}
          </button>
        </div>
      </div>
      {!isHomepage&&!isProduct&&!isCatalogue&&!mobile&&isNavigationVisible&&<nav className="editorial-header-links" aria-label="Shopping departments">{(pathname==='/men'||pathname==='/women'?DEPARTMENT_COPY.categories.map(category=>({label:category.label,href:'/category/'+pathname.slice(1)+'/'+category.slug})):navItems).map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>}
      <MobileNav
        open={mobile}
        onOpenChange={setMobile}
        items={navItems}
        onSearch={() => setSearch(true)}
        onCart={openCart}
        cartCount={cartCount}
      />
      <SearchModal open={search} onOpenChange={setSearch} />
      <LoginRequiredModal open={wishlistPrompt} onOpenChange={setWishlistPrompt} next={ROUTES.wishlist} action="wishlist" />
    </motion.header>
  );
}

function AnimatedMenuButton({open,onClick}:{open:boolean;onClick:()=>void}):ReactNode{return <button type="button" aria-label={COPY.nav.menu} aria-expanded={open} onClick={onClick} className="cruisin-menu-control" data-open={open}><span/><span/></button>;}
