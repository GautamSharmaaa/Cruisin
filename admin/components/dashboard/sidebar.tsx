// Governed by .rules v1.0
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
export interface SidebarProps { }
export function Sidebar(_props: SidebarProps): ReactNode { const pathname = usePathname(); const links = [{ label: COPY.nav.overview, href: '/' }, { label: COPY.nav.products, href: '/products' }, { label: COPY.nav.categories, href: '/categories' }, { label: COPY.nav.orders, href: '/orders' }, { label: COPY.nav.users, href: '/users' }, { label: COPY.nav.discounts, href: '/discounts' }, { label: COPY.nav.cms, href: '/cms' }, { label: COPY.nav.analytics, href: '/analytics' }]; return <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-background-elevated p-6 lg:block"><h1 className="font-display text-2xl">{COPY.brand.name}</h1><nav className="mt-10 grid gap-2">{links.map((link) => <Link key={link.href} href={link.href} className={'min-h-11 px-3 py-3 text-sm uppercase tracking-[0.1em] ' + (pathname === link.href ? 'border border-accent-gold text-text-primary' : 'text-text-secondary hover:text-text-primary')}>{link.label}</Link>)}</nav></aside>; }
