'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CUSTOMER_ACCESS as copy } from '@/constants/customer-access';
import { getAccessToken, isAssistedWindow, setAccessToken } from '@/lib/access-token';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { usePathname } from 'next/navigation';

export function AssistedAccessBanner(): ReactNode {
  const pathname = usePathname();
  const [assisted, setAssisted] = useState(false);
  const until = useAuthStore((state) => state.assistedUntil);
  const name = useAuthStore((state) => state.user?.name);

  useEffect(() => setAssisted(isAssistedWindow()), [pathname]);
  useEffect(() => {
    if (!until) return;
    const timer = window.setTimeout(() => {
      setAccessToken(null);
      useCartStore.getState().clearCart();
      useAuthStore.getState().clearSession();
    }, Math.max(0, until - Date.now()));
    return () => window.clearTimeout(timer);
  }, [until]);

  if (!assisted || pathname === '/assisted-sign-in') return null;

  return <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 border border-border bg-background-elevated p-3 text-sm text-text-primary shadow-lg" role="status">
    <span>{until ? `${copy.banner} ${name ?? ''}` : copy.ended}</span>
    <button className="border border-border px-3 py-2" type="button" onClick={async () => {
      try {
        if (getAccessToken()) await api.post('/customer-access/end');
      } finally {
        setAccessToken(null);
        useCartStore.getState().clearCart();
        useAuthStore.getState().clearSession();
        window.close();
      }
    }}>{copy.end}</button>
  </div>;
}
