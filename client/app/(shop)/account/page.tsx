// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Heart, MapPin, Package, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAccountDashboard, useDeleteAccount, useMe, useUpdateProfile } from '@/hooks/useAccount';
import { profileSchema } from '@/lib/schemas';
import { formatPrice } from '@/lib/utils';

type ProfileForm = z.infer<typeof profileSchema>;
const compactProfile = (data: ProfileForm): ProfileForm => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== '')) as ProfileForm;

export default function AccountPage(): ReactNode {
  const dashboard = useAccountDashboard();
  const me = useMe();
  const update = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const { register, handleSubmit, formState, reset } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  useEffect(() => { if (me.data) reset({ name: me.data.name || undefined, email: me.data.email || undefined, phone: me.data.phone, whatsappNumber: me.data.whatsappNumber }); }, [me.data, reset]);
  const onSubmit = (data: ProfileForm): void => { update.mutate(compactProfile(data)); };
  const data = dashboard.data;
  const metrics = [
    { label: COPY.account.orders, value: String(data?.recentOrders.length ?? 0), icon: Package },
    { label: COPY.account.wishlist, value: String(data?.wishlistCount ?? 0), icon: Heart },
    { label: COPY.account.savedAddresses, value: String(data?.savedAddresses ?? 0), icon: MapPin },
    { label: COPY.account.rewardPoints, value: String(data?.rewardPoints ?? 0), icon: Sparkles }
  ];
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><section className="mx-auto max-w-[1440px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p><div className="mt-4 flex flex-col gap-5 border-b border-border pb-10 md:flex-row md:items-end md:justify-between"><div><h1 className="font-display text-4xl text-text-primary lg:text-5xl">{data?.user.name || COPY.account.title}</h1><p className="mt-3 text-sm text-text-secondary">{COPY.account.membership}: {data?.membershipStatus ?? COPY.common.loading}</p></div><nav className="flex flex-wrap gap-2"><Link className="inline-flex h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.1em] text-text-primary" href="/account/security"><ShieldCheck size={16} className="mr-2" />{COPY.account.security}</Link><Link className="inline-flex h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.1em] text-text-primary" href="/account/notifications"><Bell size={16} className="mr-2" />{COPY.account.notifications}</Link></nav></div><div className="mt-10 grid gap-px bg-border md:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="bg-background-elevated p-6"><Icon size={18} className="text-accent-gold" /><p className="mt-6 font-mono text-3xl text-text-primary">{metric.value}</p><p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-secondary">{metric.label}</p></article>; })}</div><div className="mt-12 grid gap-10 lg:grid-cols-[1fr_480px]"><section><h2 className="font-display text-2xl text-text-primary">{COPY.account.recentOrders}</h2><div className="mt-6 grid gap-px bg-border">{data?.recentOrders.length ? data.recentOrders.map((order) => <Link key={order._id} href={'/account/orders/' + order._id} className="flex min-h-24 items-center justify-between gap-4 bg-background-elevated p-5 transition hover:bg-background-overlay"><div><p className="font-mono text-xs text-accent-gold">{order._id}</p><p className="mt-2 text-sm uppercase tracking-[0.1em] text-text-primary">{order.orderStatus}</p></div><p className="font-mono text-text-primary">{formatPrice(order.total)}</p></Link>) : <div className="bg-background-elevated p-8 text-sm text-text-secondary">{COPY.account.noOrders}</div>}</div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Link href="/account/orders" className="border border-border p-4 text-xs uppercase tracking-[0.1em] text-text-primary">{COPY.account.orders}</Link><Link href="/account/wishlist" className="border border-border p-4 text-xs uppercase tracking-[0.1em] text-text-primary">{COPY.account.wishlist}</Link><Link href="/account/addresses" className="border border-border p-4 text-xs uppercase tracking-[0.1em] text-text-primary">{COPY.account.addresses}</Link></div></section><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6"><h2 className="font-display text-2xl text-text-primary">{COPY.account.profile}</h2>{me.data?.profileIncomplete ? <p className="text-sm text-text-secondary">Complete your profile when you are ready. Your WhatsApp number is already verified.</p> : null}<Input label={COPY.auth.name} error={formState.errors.name?.message} {...register('name')} /><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.fields.whatsapp} error={formState.errors.whatsappNumber?.message} {...register('whatsappNumber')} />{update.isSuccess ? <p className="text-sm text-success">Changes saved. Verify any newly added email from your inbox.</p> : null}{update.error ? <p className="text-sm text-danger" aria-live="polite">{update.error.message}</p> : null}<Button type="submit" isLoading={update.isPending}>{COPY.account.save}</Button><Button type="button" variant="danger" onClick={() => deleteAccount.mutate()}>{COPY.account.delete}</Button></form></div></section></main>;
}
