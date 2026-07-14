// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';

export interface WishlistButtonProps { productId: string; next: string; }
export function WishlistButton({ productId, next }: WishlistButtonProps): ReactNode {
  const toggle = useWishlistStore((state) => state.toggle);
  const has = useWishlistStore((state) => state.has(productId));
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const handleClick = async (): Promise<void> => {
    if (!accessToken) { setPrompt(true); return; }
    toggle(productId);
    setLoading(true);
    try { await api.post(`/wishlist/${productId}`); } catch { toggle(productId); } finally { setLoading(false); }
  };
  return <><Button variant="secondary" onClick={handleClick} disabled={loading} aria-pressed={has} aria-label={has ? 'Remove from wishlist' : 'Add to wishlist'}><Heart size={16} className={has ? 'text-accent-gold' : 'text-text-primary'} fill={has ? 'currentColor' : 'none'} /><span className="ml-2">{COPY.nav.wishlist}</span></Button><LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={next} action="wishlist" /></>;
}
