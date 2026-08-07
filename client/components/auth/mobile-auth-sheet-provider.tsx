// Governed by .rules v1.0
'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthPage } from '@/components/auth/auth-page';

export interface MobileAuthRequest {
  next: string;
  method?: 'whatsapp' | 'alternative';
}

interface MobileAuthSheetContextValue {
  openMobileAuth: (request: MobileAuthRequest) => void;
  closeMobileAuth: () => void;
}

const MobileAuthSheetContext = createContext<MobileAuthSheetContextValue | null>(null);

export function MobileAuthSheetProvider({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const [request, setRequest] = useState<MobileAuthRequest | null>(null);
  const openMobileAuth = useCallback((nextRequest: MobileAuthRequest): void => setRequest(nextRequest), []);
  const closeMobileAuth = useCallback((): void => setRequest(null), []);
  const value = useMemo(() => ({ openMobileAuth, closeMobileAuth }), [closeMobileAuth, openMobileAuth]);

  useEffect(() => {
    setRequest(null);
  }, [pathname]);

  return <MobileAuthSheetContext.Provider value={value}>
    {children}
    <AnimatePresence>
      {request ? <AuthPage key={`${request.method ?? 'whatsapp'}:${request.next}`} initialTab="signin" presentation="sheet" initialMethod={request.method} redirectTo={request.next} onDismiss={closeMobileAuth} /> : null}
    </AnimatePresence>
  </MobileAuthSheetContext.Provider>;
}

export function useMobileAuthSheet(): MobileAuthSheetContextValue {
  const value = useContext(MobileAuthSheetContext);
  if (!value) throw new Error('useMobileAuthSheet must be used within MobileAuthSheetProvider');
  return value;
}
