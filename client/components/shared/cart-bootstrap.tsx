// Governed by .rules v1.0
'use client';

import { useEffect, type ReactNode } from 'react';
import { loadServerCart, synchronizeServerCart } from '@/lib/server-cart';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export function CartBootstrap({ children }: { children: ReactNode }): ReactNode {
  const authInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (!authInitialized) return;
    let active = true;
    const reconcile = async (): Promise<void> => {
      try {
        const local = useCartStore.getState();
        const server = await loadServerCart();
        if (!active) return;
        if ((server.items ?? []).length === 0 && local.items.length > 0) {
          const synchronized = await synchronizeServerCart(local.items, server.version ?? 0);
          if (active) useCartStore.getState().replaceFromServer(synchronized);
          return;
        }
        useCartStore.getState().replaceFromServer(server);
      } catch (error) {
        if (!active) return;
        useCartStore.setState({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Bag could not be restored' });
      }
    };
    void reconcile();
    return () => { active = false; };
  }, [authInitialized]);

  return children;
}
