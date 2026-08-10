// Governed by .rules v1.0
'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthPage } from '@/components/auth/auth-page';
import { useAuthStore } from '@/store/authStore';

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
  const user = useAuthStore((state) => state.user);
  const [request, setRequest] = useState<MobileAuthRequest | null>(null);
  const previousPathname = useRef(pathname);
  const openMobileAuth = useCallback((nextRequest: MobileAuthRequest): void => setRequest(nextRequest), []);
  const closeMobileAuth = useCallback((): void => setRequest(null), []);
  const value = useMemo(() => ({ openMobileAuth, closeMobileAuth }), [closeMobileAuth, openMobileAuth]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setRequest(null);
  }, [pathname]);

  useEffect(() => {
    // Session restoration can complete just after checkout opens this sheet.
    // Close it immediately so its body scroll lock cannot trap an authenticated
    // shopper behind a stale authentication overlay.
    if (user) setRequest(null);
  }, [user]);

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
