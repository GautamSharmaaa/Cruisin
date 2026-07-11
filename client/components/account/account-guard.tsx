// Governed by .rules v1.0
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface AccountGuardProps {
  children: ReactNode;
}

export function AccountGuard({ children }: AccountGuardProps): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace(ROUTES.login + '?redirect=' + encodeURIComponent(pathname));
    }
  }, [isInitialized, pathname, router, user]);

  if (!isInitialized || !user) {
    return <main className="min-h-dvh px-6 py-32 lg:px-20"><div className="mx-auto max-w-[1440px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p><div className="mt-6 h-14 max-w-md animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><p className="mt-6 text-sm text-text-secondary" aria-live="polite">{COPY.auth.checkingSession}</p></div></main>;
  }

  return children;
}
