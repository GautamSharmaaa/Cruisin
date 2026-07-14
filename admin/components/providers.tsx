// Governed by .rules v1.0
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
export interface ProvidersProps { children: ReactNode; }
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
