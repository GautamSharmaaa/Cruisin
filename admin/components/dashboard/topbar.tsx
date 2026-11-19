// Governed by .rules v1.0
'use client';
import { ThemeToggle } from '@cruisin/ui';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Bell, BriefcaseBusiness, FilePenLine, Gift, LogOut, Menu, Moon, Package, RefreshCw, Search, ShieldCheck, ShoppingBag, Sun, Tags, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { WORKSPACE_COPY as W } from '@/constants/workspace-copy';
import { api } from '@/lib/api';
import { adminLinks, employeeLinks } from './sidebar';
import { useAdminLogout } from '@/hooks/useAdminAuth';
import { useAdminCategories, useAdminCoupons, useAdminMe, useAdminOrders, useAdminProducts, useAdminUsers } from '@/hooks/useAdminResources';
import { useShiprocketBulkSync } from '@/hooks/useLogistics';

export interface TopbarProps {
  onMenu: () => void;
  employee: boolean;
}

export function Topbar({ onMenu, employee }: TopbarProps): ReactNode {
  const logout = useAdminLogout();
  const pathname = usePathname();
  const me = useAdminMe();
  const shiprocketSync = useShiprocketBulkSync();
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ message: string; tone: 'success' | 'warning' | 'error' } | null>(null);
  const showShiprocketSync = pathname === '/logistics' || pathname === '/analytics/costs';
  const canSyncShiprocket = ['manager', 'admin', 'superadmin'].includes(String(me.data?.role));
  const refresh = (): void => window.location.reload();
  const synchronizeShiprocket = (): void => {
    setSyncNotice(null);
    shiprocketSync.mutate(undefined, {
      onSuccess: (summary) => setSyncNotice({
        tone: summary.failed ? 'warning' : 'success',
        message: `Shiprocket sync complete: ${summary.scanned} scanned, ${summary.changed} changed, ${summary.unchanged} unchanged, ${summary.failed} failed. Analytics and order views were refreshed.`,
      }),
      onError: (error) => setSyncNotice({ tone: 'error', message: `Shiprocket sync did not complete: ${error.message}. This read-only action performs no Shiprocket mutations; check sync health before retrying.` }),
    });
  };
  useEffect(() => {
    if (!syncNotice) return undefined;
    const timer = window.setTimeout(() => setSyncNotice(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent): void => {
      const element = event.target instanceof HTMLElement ? event.target : null;
      const typing = element?.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  return <header className="cruisin-workspace-topbar">
    <div className="cruisin-tabbar">
      <button type="button" aria-label={COPY.nav.menu} onClick={onMenu} className="cruisin-toolbar-button workspace-mobile-control"><Menu size={18} /></button>
      <Link href="/" className="cruisin-workspace-brand">{W.brand}</Link>
      <nav aria-label={W.tabs} className="cruisin-workspace-tabs">
        <Link href="/" aria-current={!employee ? 'page' : undefined}><span className="inline-flex shrink-0 text-accent-gold"><ShieldCheck size={17} aria-hidden="true" /></span>{W.admin}</Link>
        <Link href="/operations" aria-current={employee ? 'page' : undefined}><BriefcaseBusiness size={15} />{W.employee}</Link>
      </nav>
      <div className="cruisin-workspace-tools">
        <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
          <Dialog.Trigger asChild><button type="button" aria-label={W.search} className="cruisin-toolbar-button"><Search size={18} /><kbd className="hidden text-[10px] text-text-muted xl:block">⌘ K</kbd></button></Dialog.Trigger>
          <Dialog.Portal><Dialog.Overlay className="ui-overlay cruisin-dialog-overlay" /><Dialog.Content className="ui-dialog cruisin-toolbar-dialog" aria-describedby={undefined}>
            <ToolbarTitle title={W.search} />
            {searchOpen && <GlobalSearch employee={employee} canSearchUsers={['admin', 'superadmin'].includes(String(me.data?.role))} onNavigate={() => setSearchOpen(false)} />}
          </Dialog.Content></Dialog.Portal>
        </Dialog.Root>
        <WorkspaceNotifications />
        <div className="hidden items-center gap-1 sm:flex">
          {showShiprocketSync ? <button type="button" onClick={synchronizeShiprocket} disabled={shiprocketSync.isPending || !canSyncShiprocket} aria-label="Sync with Shiprocket" title="Sync with Shiprocket" className="cruisin-toolbar-button"><RefreshCw size={16} className={shiprocketSync.isPending ? 'animate-spin' : ''} /></button>
            : <button type="button" aria-label={COPY.common.refresh} title={COPY.common.refresh} onClick={refresh} className="cruisin-toolbar-button"><RefreshCw size={16} /></button>}
        </div>
        <ThemeToggle reveal lightIcon={<Sun size={17} />} darkIcon={<Moon size={17} />} className="cruisin-toolbar-button grid place-items-center" />
        <button type="button" onClick={logout} aria-label={COPY.nav.logout} title={COPY.nav.logout} className="cruisin-toolbar-button"><LogOut size={16} /></button>
      </div>
    </div>
    {syncNotice && <p role={syncNotice.tone === 'error' ? 'alert' : 'status'} className={`fixed right-5 top-20 z-50 max-w-md border bg-background-elevated px-4 py-3 text-sm shadow-lg ${syncNotice.tone === 'error' ? 'border-danger text-danger' : syncNotice.tone === 'warning' ? 'border-warning' : 'border-success text-success'}`}>{syncNotice.message}</p>}
  </header>;
}

type SearchResult = { type: string; label: string; meta: string; href: string; icon: ReactNode };

const itemId = (item: { id?: string; _id?: string; slug?: string }): string => item.id ?? item._id ?? item.slug ?? '';

function GlobalSearch({ canSearchUsers, employee, onNavigate }: { canSearchUsers: boolean; employee: boolean; onNavigate: () => void }): ReactNode {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const products = useAdminProducts({ q: query.trim() || undefined, limit: 5 });
  const orders = useAdminOrders();
  const categories = useAdminCategories();
  const coupons = useAdminCoupons();
  const users = useAdminUsers(canSearchUsers && !employee);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    const pages = (employee ? employeeLinks : adminLinks).filter(page => !needle || page.label.toLowerCase().includes(needle))
      .map<SearchResult>(page => ({ type: 'Page', label: page.label, meta: '', href: page.href, icon: <page.icon size={15} /> }));
    if (employee) return pages;
    if (needle.length < 2) return [
      { type: 'Action', label: 'Add product', meta: 'Create a new product', href: '/products/new', icon: <Package size={15} /> },
      { type: 'Action', label: 'Import catalogue', meta: 'Upload, preview, dry-run', href: '/catalogues', icon: <Tags size={15} /> },
      { type: 'Action', label: 'Edit homepage', meta: 'CMS builder', href: '/cms', icon: <FilePenLine size={15} /> },
      ...pages.slice(0, 4)
    ];
    const orderMatches = (orders.data ?? []).filter((order) => [itemId(order), order.paymentStatus, order.orderStatus, order.shippingAddress?.fullName, order.shippingAddress?.phone].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((order) => ({ type: 'Order', label: itemId(order).slice(-8), meta: [order.orderStatus, order.paymentStatus].join(' / '), href: '/orders/' + itemId(order), icon: <ShoppingBag size={15} /> }));
    const categoryMatches = (categories.data ?? []).filter((category) => [category.name, category.slug, category.path].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((category) => ({ type: 'Category', label: category.name, meta: category.path ?? category.slug, href: '/categories', icon: <Tags size={15} /> }));
    const couponMatches = (coupons.data ?? []).filter((coupon) => [coupon.code, coupon.type].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((coupon) => ({ type: 'Coupon', label: coupon.code, meta: coupon.isActive ? 'Active' : 'Inactive', href: '/discounts', icon: <Gift size={15} /> }));
    const userMatches = (users.data ?? []).filter((user) => [user.name, user.email, user.role].join(' ').toLowerCase().includes(needle)).slice(0, 5).map<SearchResult>((user) => ({ type: 'User', label: user.name, meta: user.email, href: '/users', icon: <User size={15} /> }));
    const productMatches = (products.data?.items ?? []).slice(0, 5).map<SearchResult>((product) => ({ type: 'Product', label: product.title, meta: [product.slug, product.variants?.[0]?.sku].filter(Boolean).join(' / '), href: '/products/' + itemId(product), icon: <Package size={15} /> }));
    return [...pages, ...productMatches, ...orderMatches, ...categoryMatches, ...couponMatches, ...userMatches].slice(0, 12);
  }, [categories.data, coupons.data, employee, orders.data, products.data?.items, query, users.data]);

  return <div className="grid gap-3">
    <label className="flex h-11 min-w-0 items-center border border-border bg-background-input px-3 text-sm focus-within:border-accent-gold">
      <Search size={17} className="mr-2 shrink-0 text-text-muted" />
      <span className="sr-only">{W.search}</span>
      <input ref={inputRef} autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={employee ? W.employeeSearchPlaceholder : W.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-text-primary outline-none" />
      {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={15} /></button>}
    </label>
    <div className="max-h-[48dvh] overflow-auto">
      {results.length === 0 ? <p className="p-3 text-sm text-text-secondary">{W.noResults}</p> : results.map((result, index) => <Link key={result.type + result.href + index} href={result.href} onClick={onNavigate} className="flex min-w-0 items-center gap-3 p-2 text-sm hover:bg-background-overlay focus-visible:bg-background-overlay">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-border text-accent-gold">{result.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-text-primary">{result.label}</span>
          {result.meta && <span className="block truncate text-xs text-text-muted">{result.type} · {result.meta}</span>}
        </span>
      </Link>)}
    </div>
  </div>;
}

function ToolbarTitle({ title }: { title: string }): ReactNode {
  return <div className="mb-4 flex items-center justify-between gap-4">
    <Dialog.Title className="!m-0">{title}</Dialog.Title>
    <Dialog.Close asChild><button type="button" aria-label={W.close} className="cruisin-toolbar-button"><X size={17} /></button></Dialog.Close>
  </div>;
}

interface WorkspaceNotification {
  _id: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

function WorkspaceNotifications(): ReactNode {
  const me = useAdminMe();
  const client = useQueryClient();
  const key = ['admin', 'workspace', 'notifications'];
  const [open, setOpen] = useState(false);
  const notifications = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<{ data: { items: WorkspaceNotification[] } }>('/admin/operations/notifications', { params: { limit: 8 } })).data.data.items,
    refetchInterval: 90_000,
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => api.post('/admin/operations/notifications/' + id + '/read', {}),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const unread = notifications.data?.filter(item => !item.readAt).length ?? 0;
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" aria-label={W.notifications} className="cruisin-toolbar-button relative"><Bell size={18} />{unread > 0 && <span aria-hidden="true" className="cruisin-unread-dot" />}</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="ui-overlay cruisin-dialog-overlay" /><Dialog.Content className="ui-dialog cruisin-toolbar-dialog" aria-describedby={undefined}>
      <ToolbarTitle title={W.notifications} />
      {notifications.isLoading && <p role="status">{W.loading}</p>}
      {(notifications.isError || markRead.isError) && <p role="alert" className="text-sm text-danger">{W.notificationsError}</p>}
      {notifications.data?.length === 0 && <p className="py-3 text-sm text-text-secondary">{W.emptyNotifications}</p>}
      <ul className="max-h-[48dvh] overflow-auto">
        {notifications.data?.map(item => <li key={item._id} className="flex items-start justify-between gap-3 border-b border-border py-3">
          <div><p className="text-sm">{item.message}</p><time dateTime={item.createdAt} className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString('en-IN')}</time></div>
          {!item.readAt && <Button variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate(item._id)}>{W.markRead}</Button>}
        </li>)}
      </ul>
      {['admin', 'superadmin'].includes(me.data?.role ?? '') && <Link className="mt-4 block text-sm text-accent-gold underline" href="/notifications" onClick={() => setOpen(false)}>WhatsApp notification settings</Link>}
      <Link className="mt-4 block text-sm text-accent-gold underline" href="/activity" onClick={() => setOpen(false)}>{W.allActivity}</Link>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
