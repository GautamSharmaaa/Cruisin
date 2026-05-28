// Governed by .rules v1.0
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { API_CONFIG } from '@/constants/config';

export interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactNode {
  const router = useRouter();
  useEffect(() => {
    if (!window.localStorage.getItem(API_CONFIG.accessTokenKey)) router.replace('/login');
  }, [router]);
  return children;
}
