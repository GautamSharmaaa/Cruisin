// Governed by .rules v1.0
'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthBootstrap } from '@/components/shared/auth-bootstrap';
import { IDENTITY_CONFIG } from '@/constants/config';
import { queryClient } from '@/lib/query-client';

export interface ProvidersProps { children: ReactNode; }

export function Providers({ children }: ProvidersProps): ReactNode {
  const content = <QueryClientProvider client={queryClient}><AuthBootstrap>{children}</AuthBootstrap></QueryClientProvider>;
  return IDENTITY_CONFIG.googleClientId ? <GoogleOAuthProvider clientId={IDENTITY_CONFIG.googleClientId}>{content}</GoogleOAuthProvider> : content;
}
