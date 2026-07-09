// Governed by .rules v1.0
'use client';

import { FilePenLine, Gift, LogOut, Menu, Package, RefreshCw, Search, ShoppingBag, Tags, User, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useAdminLogout } from '@/hooks/useAdminAuth';
import { useAdminCategories, useAdminCoupons, useAdminOrders, useAdminProducts, useAdminUsers } from '@/hooks/useAdminResources';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  onMenu: () => void;
}

export function Topbar({ onMenu }: TopbarProps): ReactNode {
  const logout = useAdminLogout();
  const refresh = (): void => window.location.reload();
  return <header className="sticky top-0 z-30 border-b border-border bg-background-primary/90 backdrop-blur-2xl"><div className="mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8"><div className="flex min-w-0 flex-1 items-center gap-3"><button type="button" aria-label={COPY.nav.menu} onClick={onMenu} className="flex h-11 w-11 shrink-0 items-center justify-center border border-border text-text-primary transition hover:border-border-strong lg:hidden"><Menu size={18} /></button><GlobalSearch /></div><div className="flex shrink-0 items-center gap-2"><Button type="button" variant="ghost" onClick={refresh} aria-label={COPY.common.refresh} className="px-3"><RefreshCw size={16} /></Button><Button type="button" variant="secondary" onClick={logout} aria-label={COPY.nav.logout} className="gap-2"><LogOut size={16} /><span className="hidden sm:inline">{COPY.nav.logout}</span></Button></div></div></header>;
}

type SearchResult = { type: string; label: string; meta: string; href: string; icon: ReactNode };

const itemId = (item: { id?: string; _id?: string; slug?: string }): string => item.id ?? item._id ?? item.slug ?? '';

function GlobalSearch(): ReactNode {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const products = useAdminProducts({ q: query.trim() || undefined, limit: 5 });
  const orders = useAdminOrders();
  const categories = useAdminCategories();
  const coupons = useAdminCoupons();
  const users = useAdminUsers();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.key === '/' && document.activeElement?.tagName !== 'INPUT') || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [
      { type: 'Action', label: 'Add product', meta: 'Create a new product', href: '/products/new', icon: <Package size={15} /> },
      { type: 'Action', label: 'Import catalogue', meta: 'Upload, preview, dry-run', href: '/catalogues', icon: <Tags size={15} /> },
      { type: 'Action', label: 'Edit homepage', meta: 'CMS builder', href: '/cms', icon: <FilePenLine size={15} /> }
    ];
    const orderMatches = (orders.data ?? []).filter((order) => [itemId(order), order.paymentStatus, order.orderStatus, order.shippingAddress?.fullName, order.shippingAddress?.phone].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((order) => ({ type: 'Order', label: itemId(order).slice(-8), meta: [order.orderStatus, order.paymentStatus].join(' / '), href: '/orders/' + itemId(order), icon: <ShoppingBag size={15} /> }));
    const categoryMatches = (categories.data ?? []).filter((category) => [category.name, category.slug, category.path].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((category) => ({ type: 'Category', label: category.name, meta: category.path ?? category.slug, href: '/categories', icon: <Tags size={15} /> }));
    const couponMatches = (coupons.data ?? []).filter((coupon) => [coupon.code, coupon.type].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((coupon) => ({ type: 'Coupon', label: coupon.code, meta: coupon.isActive ? 'Active' : 'Inactive', href: '/discounts', icon: <Gift size={15} /> }));
    const userMatches = (users.data ?? []).filter((user) => [user.name, user.email, user.role].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((user) => ({ type: 'User', label: user.name, meta: user.email, href: '/users', icon: <User size={15} /> }));
    const productMatches = (products.data?.items ?? []).slice(0, 5).map<SearchResult>((product) => ({ type: 'Product', label: product.title, meta: [product.slug, product.variants?.[0]?.sku].filter(Boolean).join(' / '), href: '/products/' + itemId(product), icon: <Package size={15} /> }));
    return [...productMatches, ...orderMatches, ...categoryMatches, ...couponMatches, ...userMatches].slice(0, 12);
  }, [categories.data, coupons.data, orders.data, products.data?.items, query, users.data]);

  return <div className="relative min-w-0 flex-1 md:max-w-2xl">
    <label className="flex h-11 min-w-0 items-center border border-border bg-background-input px-3 text-sm transition focus-within:border-accent-gold">
      <Search size={17} className="mr-2 shrink-0 text-text-muted" />
      <span className="sr-only">{COPY.common.search}</span>
      <input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search products, orders, customers..." className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted" />
      {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="ml-2 text-text-muted transition hover:text-text-primary"><X size={15} /></button> : <span className="hidden rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-text-muted sm:inline">/</span>}
    </label>
    {open ? <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70dvh] overflow-auto border border-border-strong bg-background-elevated p-2 shadow-lg">
      {results.length === 0 ? <p className="p-4 text-sm text-text-secondary">No results found.</p> : results.map((result, index) => <Link key={result.type + result.href + index} href={result.href} onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3 border border-transparent p-3 text-sm transition hover:border-border hover:bg-background-primary">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-border text-accent-gold">{result.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-text-primary">{result.label}</span>
          <span className="mt-1 block truncate text-xs text-text-muted">{result.type} · {result.meta}</span>
        </span>
      </Link>)}
      <div className={cn('border-t border-border px-3 py-2 text-[11px] text-text-muted', query.trim().length < 2 && 'hidden')}>Press `/` or Cmd/Ctrl+K to search again.</div>
    </div> : null}
  </div>;
}
