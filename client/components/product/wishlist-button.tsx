// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useWishlistStore } from '@/store/wishlistStore';

export interface WishlistButtonProps { productId: string; }
export function WishlistButton({ productId }: WishlistButtonProps): ReactNode { const toggle = useWishlistStore((state) => state.toggle); return <Button variant="secondary" onClick={() => toggle(productId)}><Heart size={16} /> {COPY.nav.wishlist}</Button>; }
