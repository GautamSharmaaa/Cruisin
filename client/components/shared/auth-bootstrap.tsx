// Governed by .rules v1.0
'use client';

import { useEffect, type ReactNode } from 'react';
import { api, refreshAccessToken } from '@/lib/api';
import type { ServerCart } from '@/lib/server-cart';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps): ReactNode {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setWishlistIds = useWishlistStore((state) => state.setIds);

  useEffect(() => {
    let active = true;
    const clearExpiredSession = (): void => {
      // The initial refresh request can finish after OTP login has already
      // established a new session. Do not let that stale 401 erase it.
      if (useAuthStore.getState().accessToken) return;
      clearSession();
      setWishlistIds([]);
    };
    const restoreSession = async (): Promise<void> => {
      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          if (active) clearExpiredSession();
          return;
        }
        const response = await api.get<ApiEnvelope<User>>('/auth/me');
        if (active) {
          const [wishlist, mergedCart] = await Promise.all([
            api.get<ApiEnvelope<{ products?: Array<{ _id?: string; id?: string }> }>>('/wishlist').catch(() => null),
            api.post<ApiEnvelope<ServerCart>>('/cart/merge').catch(() => null)
          ]);
          if (!active) return;
          if (mergedCart) useCartStore.getState().replaceFromServer(mergedCart.data.data);
          if (wishlist) setWishlistIds((wishlist.data.data.products ?? []).map((product) => product.id ?? product._id ?? '').filter(Boolean));
          setSession(response.data.data, accessToken);
        }
      } catch {
        if (active) clearExpiredSession();
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, [clearSession, setSession, setWishlistIds]);

  return children;
}
