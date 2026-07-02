// Governed by .rules v1.0
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { useAdminMe } from '@/hooks/useAdminResources';
import { getAccessToken, setAccessToken } from '@/lib/access-token';
import { refreshAdminAccessToken } from '@/lib/api';
import type { UserDto } from '@/types/dto.types';

export interface AuthGuardProps {
  children: ReactNode;
}

const adminRoles = ['admin', 'superadmin', 'manager', 'viewer'] as const;
const isAdminRole = (role: UserDto['role']): boolean => adminRoles.some((adminRole) => adminRole === role);

export function AuthGuard({ children }: AuthGuardProps): ReactNode {
  const router = useRouter();
  const [ready, setReady] = useState(() => Boolean(getAccessToken()));
  const me = useAdminMe(ready);

  useEffect(() => {
    let active = true;
    if (ready) return () => { active = false; };
    void refreshAdminAccessToken().then((token) => {
      if (!active) return;
      if (token) setReady(true);
      else router.replace('/login');
    });
    return () => { active = false; };
  }, [ready, router]);

  useEffect(() => {
    if (!ready || !me.isError) return;
    let active = true;
    void refreshAdminAccessToken().then((token) => {
      if (!active) return;
      if (token) void me.refetch();
      else {
        setAccessToken(null);
        router.replace('/login');
      }
    });
    return () => {
      active = false;
    };
  }, [me, ready, router]);

  if (!ready || me.isLoading) return <main className="flex min-h-dvh items-center justify-center bg-background-primary px-6"><div className="border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.auth.checking}</p><p className="mt-3 text-sm text-text-secondary">{COPY.brand.name}</p></div></main>;
  if (me.isError) {
    return <main className="flex min-h-dvh items-center justify-center bg-background-primary px-6"><div className="border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.auth.checking}</p><p className="mt-3 text-sm text-text-secondary">{COPY.brand.name}</p></div></main>;
  }
  if (!me.data || !isAdminRole(me.data.role)) return <main className="flex min-h-dvh items-center justify-center bg-background-primary px-6"><div className="border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-display text-2xl text-text-primary">{COPY.auth.denied}</p><p className="mt-3 text-sm text-text-secondary">{COPY.auth.checking}</p></div></main>;
  return children;
}
