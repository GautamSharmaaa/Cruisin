// Governed by .rules v1.0
'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthBootstrap } from '@/components/shared/auth-bootstrap';
import { IDENTITY_CONFIG } from '@/constants/config';

export interface ProvidersProps { children: ReactNode; }

export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 }, mutations: { retry: 0 } } }));
  const content = <QueryClientProvider client={queryClient}><AuthBootstrap>{children}</AuthBootstrap></QueryClientProvider>;
  return IDENTITY_CONFIG.googleClientId ? <GoogleOAuthProvider clientId={IDENTITY_CONFIG.googleClientId}>{content}</GoogleOAuthProvider> : content;
}
