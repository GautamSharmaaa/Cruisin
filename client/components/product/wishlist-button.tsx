// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { api } from '@/lib/api';
import { performWishlistToggle } from '@/lib/meta-actions';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types/product.types';

export interface WishlistButtonProps { product: Product; next: string; }
export function WishlistButton({ product, next }: WishlistButtonProps): ReactNode {
  const productId = product.id;
  const toggle = useWishlistStore((state) => state.toggle);
  const has = useWishlistStore((state) => state.has(productId));
  const accessToken = useAuthStore((state) => state.accessToken);
  const { openMobileAuth } = useMobileAuthSheet();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const handleClick = async (): Promise<void> => {
    if (!accessToken) { if (window.matchMedia('(max-width: 767px)').matches) openMobileAuth({ next }); else setPrompt(true); return; }
    setLoading(true);
    await performWishlistToggle({ authenticated: true, product, isWishlisted: has, toggle: () => toggle(productId), request: () => api.post(`/wishlist/${productId}`) });
    setLoading(false);
  };
  return <><Button variant="secondary" onClick={handleClick} disabled={loading} aria-pressed={has} aria-label={has ? 'Remove from wishlist' : 'Add to wishlist'}><Heart size={16} className={has ? 'text-accent-gold' : 'text-text-primary'} fill={has ? 'currentColor' : 'none'} /><span className="ml-2">{COPY.nav.wishlist}</span></Button><LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={next} action="wishlist" /></>;
}
