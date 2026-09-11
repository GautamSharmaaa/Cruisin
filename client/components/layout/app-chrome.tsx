// Governed by .rules v1.0
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MobileAuthSheetProvider } from '@/components/auth/mobile-auth-sheet-provider';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { PromotionRuntime } from '@/components/promotion/promotion-runtime';
import { SearchModal } from '@/components/shared/search-modal';
import { useCartStore } from '@/store/cartStore';

export interface AppChromeProps { children: ReactNode; }
export function AppChrome({ children }: AppChromeProps): ReactNode {
  const [search, setSearch] = useState(false);
  const pathname = usePathname();
  const closeCart = useCartStore((state) => state.closeCart);
  const cartOpen = useCartStore((state) => state.isOpen);
  const focusedCommerce = pathname === '/cart' || pathname === '/checkout';
  useEffect(() => { closeCart(); }, [closeCart, pathname]);
  return <MobileAuthSheetProvider><div className="luxury-noise">{focusedCommerce ? <div className="hidden md:block"><Navbar /></div> : <Navbar />}<div id="main" tabIndex={-1} className="relative z-10 min-h-dvh">{children}</div>{focusedCommerce ? <div className="hidden md:block"><Footer /></div> : <Footer />}<CartDrawer />{focusedCommerce ? null : <BottomNav onSearch={() => setSearch(true)} />}<SearchModal open={search} onOpenChange={setSearch} /><PromotionRuntime blocked={search || cartOpen} /></div></MobileAuthSheetProvider>;
}
