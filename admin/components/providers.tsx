// Governed by .rules v1.0
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '@/lib/query-client';
export interface ProvidersProps { children: ReactNode; }
export function Providers({ children }: ProvidersProps): ReactNode { return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>; }
