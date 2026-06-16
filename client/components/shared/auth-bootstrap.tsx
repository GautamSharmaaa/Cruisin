// Governed by .rules v1.0
'use client';

import { useEffect, type ReactNode } from 'react';
import { api, refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps): ReactNode {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;
    const restoreSession = async (): Promise<void> => {
      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          if (active) clearSession();
          return;
        }
        const response = await api.get<ApiEnvelope<User>>('/auth/me');
        if (active) setSession(response.data.data, accessToken);
      } catch {
        if (active) clearSession();
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, [clearSession, setSession]);

  return children;
}
