// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { api } from '@/lib/api';

export interface WishlistButtonProps { productId: string; }
export function WishlistButton({ productId }: WishlistButtonProps): ReactNode {
	const toggleLocal = useWishlistStore((state) => state.toggle);
	const has = useWishlistStore((state) => state.has(productId));
	const accessToken = useAuthStore((state) => state.accessToken);
	const [loading, setLoading] = useState(false);

	const handleClick = async (): Promise<void> => {
		toggleLocal(productId);
		if (!accessToken) return;
		setLoading(true);
		try {
			await api.post(`/wishlist/${productId}`);
		} catch (err) {
			// Authenticated API failures should not erase the visible local choice.
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button variant="secondary" onClick={handleClick} disabled={loading}>
			<Heart size={16} className={has ? 'text-accent-gold' : 'text-text-primary'} fill={has ? 'currentColor' : 'none'} />
			<span className="ml-2">{COPY.nav.wishlist}</span>
		</Button>
	);
}
