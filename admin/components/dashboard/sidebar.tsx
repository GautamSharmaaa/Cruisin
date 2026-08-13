// Governed by .rules v1.0
'use client';
import { BarChart3, Boxes, Calculator, ChevronRight, FilePenLine, Files, LayoutDashboard, Package, Percent, RefreshCcw, Repeat2, Rows3, ShoppingBag, Truck, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { label: COPY.nav.overview, href: '/', icon: LayoutDashboard },
  { label: COPY.nav.products, href: '/products', icon: Package },
  { label: COPY.nav.catalogues, href: '/catalogues', icon: Files },
  { label: COPY.nav.categories, href: '/categories', icon: Boxes },
  { label: COPY.nav.storefront, href: '/storefront', icon: Rows3 },
  { label: COPY.nav.delivery, href: '/delivery', icon: Truck },
  { label: COPY.nav.orders, href: '/orders', icon: ShoppingBag },
  { label: 'Logistics', href: '/logistics', icon: Truck },
  { label: 'Logistics analytics', href: '/logistics/analytics', icon: BarChart3 },
  { label: 'NDR recovery', href: '/logistics/ndr', icon: RefreshCcw },
  { label: 'RTO recovery', href: '/logistics/rto', icon: RefreshCcw },
  { label: 'Returns', href: '/returns', icon: Repeat2 },
  { label: 'Exchanges', href: '/exchanges', icon: Repeat2 },
  { label: COPY.nav.users, href: '/users', icon: Users },
  { label: COPY.nav.discounts, href: '/discounts', icon: Percent },
  { label: COPY.nav.cms, href: '/cms', icon: FilePenLine },
  { label: COPY.nav.analytics, href: '/analytics', icon: BarChart3 },
  { label: 'Cost & COD analytics', href: '/analytics/costs', icon: Calculator }
] as const;

export function Sidebar({ isOpen, onClose }: SidebarProps): ReactNode {
  const pathname = usePathname();
  const panel = <aside className="flex h-dvh w-72 flex-col overflow-hidden border-r border-border bg-background-primary/95 p-5 shadow-lg backdrop-blur-2xl">
    <div className="flex shrink-0 items-start justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-gold">{COPY.brand.eyebrow}</p><h1 className="mt-2 font-display text-3xl text-text-primary">{COPY.brand.name}</h1><p className="mt-3 max-w-48 text-sm leading-6 text-text-secondary">{COPY.brand.tagline}</p></div><button type="button" aria-label={COPY.nav.close} onClick={onClose} className="flex h-11 w-11 items-center justify-center text-text-secondary transition hover:text-text-primary lg:hidden"><X size={18} /></button></div>
    <nav aria-label="Admin navigation" className="mt-10 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">{links.map((link) => { const Icon = link.icon; const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`)); return <Link key={link.href} href={link.href} onClick={onClose} className={'group flex min-h-11 items-center justify-between border px-3 py-3 text-sm uppercase tracking-[0.1em] transition active:scale-[0.98] ' + (isActive ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-transparent text-text-secondary hover:border-border hover:bg-background-elevated hover:text-text-primary')}><span className="flex items-center gap-3"><Icon size={17} />{link.label}</span><ChevronRight size={15} className={isActive ? 'text-accent-gold' : 'opacity-0 transition group-hover:opacity-100'} /></Link>; })}</nav>
    <div className="mt-4 shrink-0 border border-border bg-background-elevated p-4"><p className="font-mono text-xs uppercase tracking-[0.14em] text-accent-gold">{COPY.common.online}</p><p className="mt-2 text-sm text-text-secondary">{COPY.overview.trend}</p></div>
  </aside>;
  return <>{isOpen ? <div className="fixed inset-0 z-50 bg-background-primary/70 backdrop-blur lg:hidden" onClick={onClose}>{panel}</div> : null}<div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{panel}</div></>;
}
