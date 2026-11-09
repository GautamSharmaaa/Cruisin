// Governed by .rules v1.0
'use client';

import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {experienceMotion} from '@/lib/animations';
import {EXPERIENCE_COPY as E} from '@/constants/experience-copy';
import { Heart } from 'lucide-react';
import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import {compactAuthQuery} from '@/lib/auth-presentation';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { api } from '@/lib/api';
import { performWishlistToggle } from '@/lib/meta-actions';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types/product.types';

export interface WishlistButtonProps { product: Product; next: string; compact?:boolean; }
export function WishlistButton({ product, next, compact=false }: WishlistButtonProps): ReactNode {
  const experience=useStorefrontExperience();
  const [feedback,setFeedback]=useState('');
  useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(''),2400);return()=>clearTimeout(timer);},[feedback]);
  const productId = product.id;
  const toggle = useWishlistStore((state) => state.toggle);
  const has = useWishlistStore((state) => state.has(productId));
  const accessToken = useAuthStore((state) => state.accessToken);
  const { openMobileAuth } = useMobileAuthSheet();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const handleClick = async (): Promise<void> => {
    if (!accessToken) { if (window.matchMedia(compactAuthQuery).matches) openMobileAuth({ next }); else setPrompt(true); return; }
    setLoading(true);
    const result=await performWishlistToggle({ authenticated: true, product, isWishlisted: has, toggle: () => toggle(productId), request: () => api.post(`/wishlist/${productId}`) });
    setFeedback(result==='added'?E.added:result==='removed'?E.removed:E.failed);
    setLoading(false);
  };
  if(!experience.wishlistEnabled)return null;
  return <><Button style={{'--heart-duration':(experience.motionPace==='quick'?experienceMotion.heartQuickMs:experienceMotion.heartMs)+'ms'} as CSSProperties} className={compact?"editorial-wishlist-trigger":"wishlist-action"} data-saved={has} data-wishlist-motion={experience.wishlistAnimation} variant="secondary" onClick={event=>{event.preventDefault();event.stopPropagation();void handleClick();}} disabled={loading} aria-pressed={has} aria-label={has?E.remove:E.add}><Heart size={16} className={has ? 'text-accent-gold' : 'text-text-primary'} fill={has ? 'currentColor' : 'none'} />{!compact&&<span className="ml-2">{COPY.nav.wishlist}</span>}</Button><span className={compact&&feedback?"wishlist-feedback":"sr-only"} role="status" aria-live="polite">{feedback}</span><LoginRequiredModal open={prompt} onOpenChange={setPrompt} next={next} action="wishlist" /></>;
}
