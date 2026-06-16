// Governed by .rules v1.0
'use client';

import { Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useMarkNotificationRead, useNotifications } from '@/hooks/useAccount';

export default function NotificationsPage(): ReactNode {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><div className="mx-auto max-w-[1000px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p><h1 className="mt-4 font-display text-4xl text-text-primary">{COPY.account.notifications}</h1><div className="mt-10 grid gap-px bg-border">{notifications.data?.length ? notifications.data.map((notification) => <article key={notification._id} className="flex flex-col gap-4 bg-background-elevated p-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-4"><Bell size={18} className={notification.readAt ? 'text-text-muted' : 'text-accent-gold'} /><div><p className="text-sm text-text-primary">{notification.title}</p><p className="mt-2 text-sm text-text-secondary">{notification.body}</p><p className="mt-2 text-xs text-text-muted">{new Date(notification.createdAt).toLocaleString()}</p></div></div>{notification.readAt ? null : <Button variant="secondary" onClick={() => markRead.mutate(notification._id)}>{COPY.common.open}</Button>}</article>) : <div className="bg-background-elevated p-10 text-center text-sm text-text-secondary">{COPY.account.noNotifications}</div>}</div></div></main>;
}
