// Governed by .rules v1.0
'use client';
import {SmoothStorefront} from './smooth-storefront';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MobileAuthSheetProvider } from '@/components/auth/mobile-auth-sheet-provider';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Footer } from '@/components/layout/footer';
import { CruisinHub } from '@/components/layout/cruisin-hub';
import { Navbar } from '@/components/layout/navbar';
import { PromotionRuntime } from '@/components/promotion/promotion-runtime';
import { SearchModal } from '@/components/shared/search-modal';
import { useCartStore } from '@/store/cartStore';

export interface AppChromeProps { children: ReactNode; }
export function AppChrome({ children }: AppChromeProps): ReactNode {
  const [search, setSearch] = useState(false);
  const [stories, setStories] = useState(false);
  const pathname = usePathname();
  const closeCart = useCartStore((state) => state.closeCart);
  const cartOpen = useCartStore((state) => state.isOpen);
  const preview=pathname.startsWith('/cms-preview/');
  const focusedCommerce = pathname === '/cart' || pathname === '/checkout';
  useEffect(() => { closeCart(); }, [closeCart, pathname]);
  return <SmoothStorefront><MobileAuthSheetProvider><div className="editorial-storefront">{focusedCommerce ? <div className="hidden md:block"><Navbar /></div> : <Navbar />}<div id="main" tabIndex={-1} className="relative z-10 min-h-dvh">{children}</div>{focusedCommerce ? <div className="hidden md:block"><Footer /></div> : <Footer />}<CartDrawer /><SearchModal open={search} onOpenChange={setSearch} />{!preview&&!focusedCommerce&&<CruisinHub onStoriesChange={setStories}/>}{!preview&&<PromotionRuntime blocked={search || cartOpen || stories} />}</div></MobileAuthSheetProvider></SmoothStorefront>;
}
