// Governed by .rules v1.0
'use client';

import { useState, type ReactNode } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { SearchModal } from '@/components/shared/search-modal';

export interface AppChromeProps { children: ReactNode; }
export function AppChrome({ children }: AppChromeProps): ReactNode { const [search, setSearch] = useState(false); return <div className="luxury-noise"><Navbar /><div id="main" className="relative z-10 pt-16 lg:pt-20">{children}</div><Footer /><CartDrawer /><BottomNav onSearch={() => setSearch(true)} /><SearchModal open={search} onOpenChange={setSearch} /></div>; }
