// Governed by .rules v1.0
'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { IDENTITY_CONFIG } from '@/constants/config';
export interface ProvidersProps { children: ReactNode; }
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } }));
  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return IDENTITY_CONFIG.googleClientId ? <GoogleOAuthProvider clientId={IDENTITY_CONFIG.googleClientId}>{content}</GoogleOAuthProvider> : content;
}
