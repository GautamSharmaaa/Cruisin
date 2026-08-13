// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ArrowUpRight, Bell, Heart, LogOut, MapPin, Package, RotateCcw, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAccountDashboard, useMe, useUpdateProfile } from '@/hooks/useAccount';
import { useLogout } from '@/hooks/useAuth';
import { useCustomerWallet } from '@/hooks/useReturns';
import { profileSchema } from '@/lib/schemas';
import { formatPrice } from '@/lib/utils';

type ProfileForm = z.infer<typeof profileSchema>;
const compactProfile = (data: ProfileForm): ProfileForm => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== '')) as ProfileForm;
const orderProgress = (status: string): number => {
  const normalized = status.toLowerCase();
  if (normalized === 'delivered') return 100;
  if (['shipped', 'in_transit', 'out_for_delivery'].includes(normalized)) return 72;
  if (['confirmed', 'processing'].includes(normalized)) return 38;
  return 8;
};

export default function AccountPage(): ReactNode {
  const dashboard = useAccountDashboard();
  const me = useMe();
  const update = useUpdateProfile();
  const logout = useLogout();
  const wallet = useCustomerWallet();
  const [greeting, setGreeting] = useState('Welcome');
  const { register, handleSubmit, formState, reset } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  useEffect(() => { if (me.data) reset({ name: me.data.name || undefined, email: me.data.email || undefined, phone: me.data.phone, whatsappNumber: me.data.whatsappNumber }); }, [me.data, reset]);
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  }, []);
  const onSubmit = (data: ProfileForm): void => { update.mutate(compactProfile(data)); };
  const data = dashboard.data;
  const latestOrder = data?.recentOrders[0];
  const accountActions = [
    { label: COPY.account.orders, description: 'Track purchases and delivery', value: `${data?.recentOrders.length ?? 0} recent`, href: '/account/orders', icon: Package },
    { label: 'Returns & refunds', description: 'Requests, pickup and refund status', value: 'Manage', href: '/account/returns', icon: RotateCcw },
    { label: 'Cruisin Wallet', description: 'Credits ready for future purchases', value: formatPrice(wallet.data?.availableBalance ?? 0), href: '/account/wallet', icon: WalletCards },
    { label: COPY.account.wishlist, description: 'Your privately saved pieces', value: `${data?.wishlistCount ?? 0} saved`, href: '/account/wishlist', icon: Heart },
    { label: COPY.account.savedAddresses, description: 'Faster checkout and delivery', value: `${data?.savedAddresses ?? 0} saved`, href: '/account/addresses', icon: MapPin },
    { label: COPY.account.security, description: 'Password, providers and sessions', value: 'Private', href: '/account/security', icon: ShieldCheck }
  ];
  return <main className="px-5 py-24 sm:px-6 sm:py-28 lg:px-20 lg:py-36">
    <section className="mx-auto max-w-[1440px]">
      <header className="border-b border-border pb-8 md:pb-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-accent text-xs uppercase tracking-[0.22em] text-accent-gold sm:text-sm">{greeting}</p>
            <h1 className="mt-3 font-display text-5xl leading-none text-text-primary sm:text-6xl lg:text-7xl">{data?.user.name?.split(' ')[0] || 'Client'}</h1>
            <span className="mt-4 inline-flex border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-gold">{COPY.account.membership} · {data?.membershipStatus ?? COPY.common.loading}</span>
          </div>
          <nav aria-label="Account controls" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link className="inline-flex h-12 items-center justify-center border border-border px-3 text-[11px] uppercase tracking-[0.08em] text-text-primary transition hover:border-border-strong hover:bg-background-elevated sm:h-11 sm:px-4" href="/account/security"><ShieldCheck size={16} className="mr-2 shrink-0" />{COPY.account.security}</Link>
            <Link className="inline-flex h-12 items-center justify-center border border-border px-3 text-[11px] uppercase tracking-[0.08em] text-text-primary transition hover:border-border-strong hover:bg-background-elevated sm:h-11 sm:px-4" href="/account/notifications"><Bell size={16} className="mr-2 shrink-0" />{COPY.account.notifications}</Link>
            <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="col-span-2 inline-flex h-12 items-center justify-center border border-danger bg-danger px-4 text-xs uppercase tracking-[0.1em] text-text-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 sm:h-11"><LogOut size={16} className="mr-2" />{logout.isPending ? 'Logging out…' : COPY.auth.logout}</button>
          </nav>
        </div>
      </header>

      {latestOrder ? <Link href={'/account/orders/' + latestOrder._id} aria-label={`Open full details for order ${latestOrder.orderNumber ?? latestOrder._id}`} className="group mt-8 block border border-border bg-background-primary p-5 transition duration-300 hover:border-accent-gold/60 hover:bg-background-elevated sm:p-8">
        <div className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-gold">{latestOrder.orderStatus.replaceAll('_', ' ')}</p>
            <h2 className="mt-3 break-words font-display text-3xl text-text-primary sm:text-4xl lg:text-5xl">Order #{latestOrder.orderNumber ?? latestOrder._id.slice(-8).toUpperCase()}</h2>
            <p className="mt-3 text-sm text-text-secondary">Tap to view products, delivery, payment and complete tracking details.</p>
          </div>
          <ArrowRight className="h-7 w-7 shrink-0 text-text-primary transition duration-300 group-hover:translate-x-1 group-hover:text-accent-gold" aria-hidden="true" />
        </div>
        <div className="mt-8 h-1 overflow-hidden bg-border" aria-hidden="true"><div className="account-order-progress h-full transition-all duration-700" style={{ width: `${orderProgress(latestOrder.orderStatus)}%` }} /></div>
        <div className="mt-4 grid grid-cols-4 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted sm:text-[11px]"><span>Placed</span><span className="text-center">Packed</span><span className="text-center">In transit</span><span className="text-right">Delivered</span></div>
      </Link> : null}

      <section className="mt-10" aria-labelledby="account-hub-title">
        <div className="flex items-end justify-between gap-4">
          <div><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private account</p><h2 id="account-hub-title" className="mt-2 font-display text-3xl text-text-primary">Your essentials</h2></div>
          <p className="hidden text-xs uppercase tracking-[0.12em] text-text-muted sm:block">Select to manage</p>
        </div>
        <nav aria-label="Account services" className="mt-6 grid grid-cols-2 gap-px bg-border lg:grid-cols-3">
          {accountActions.map((action) => { const Icon = action.icon; return <Link key={action.label} href={action.href} className="group relative flex min-h-44 min-w-0 flex-col justify-between bg-background-elevated p-4 transition duration-300 hover:bg-background-overlay sm:min-h-48 sm:p-6"><div className="flex items-start justify-between gap-3"><Icon className="h-5 w-5 text-accent-gold" aria-hidden="true" /><ArrowUpRight className="h-4 w-4 text-text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-primary" aria-hidden="true" /></div><div><p className="break-words font-display text-xl text-text-primary sm:text-2xl">{action.label}</p><p className="mt-2 hidden text-xs leading-5 text-text-muted sm:block">{action.description}</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-gold sm:text-xs">{action.value}</p></div></Link>; })}
        </nav>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_480px]">
        <section>
          <div className="flex items-end justify-between gap-4"><div><p className="font-accent text-xs uppercase tracking-[0.14em] text-accent-gold">Purchase history</p><h2 className="mt-2 font-display text-3xl text-text-primary">{COPY.account.recentOrders}</h2></div><Link href="/account/orders" className="min-h-11 shrink-0 py-3 text-xs uppercase tracking-[0.1em] text-text-secondary hover:text-accent-gold">View all</Link></div>
          <div className="mt-5 grid gap-px bg-border sm:mt-6">{data?.recentOrders.length ? data.recentOrders.map((order) => <Link key={order._id} href={'/account/orders/' + order._id} className="group flex min-h-24 items-center justify-between gap-3 bg-background-elevated p-4 transition hover:bg-background-overlay sm:gap-4 sm:p-5"><div className="min-w-0"><p className="break-all font-mono text-[11px] text-accent-gold sm:text-xs">{order._id}</p><p className="mt-2 text-sm uppercase tracking-[0.1em] text-text-primary">{order.orderStatus}</p></div><div className="flex shrink-0 items-center gap-3"><p className="font-mono text-sm text-text-primary sm:text-base">{formatPrice(order.total)}</p><ArrowUpRight className="h-4 w-4 text-text-muted transition group-hover:text-text-primary" /></div></Link>) : <div className="bg-background-elevated p-8 text-sm text-text-secondary">{COPY.account.noOrders}</div>}</div>
        </section>

        <div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-5 sm:p-6"><p className="font-accent text-xs uppercase tracking-[0.14em] text-accent-gold">Personal details</p><h2 className="font-display text-3xl text-text-primary">{COPY.account.profile}</h2><p className="text-sm leading-6 text-text-secondary">Keep delivery and contact details current. Changes are never shared publicly.</p><Input label={COPY.auth.name} error={formState.errors.name?.message} {...register('name')} /><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.fields.whatsapp} error={formState.errors.whatsappNumber?.message} {...register('whatsappNumber')} />{update.isSuccess ? <p className="text-sm text-success">Changes saved. Verify any newly added email from your inbox.</p> : null}{update.error ? <p className="text-sm text-danger" aria-live="polite">{update.error.message}</p> : null}<Button type="submit" isLoading={update.isPending}>{COPY.account.save}</Button></form>
        </div>
      </div>
    </section>
  </main>;
}
