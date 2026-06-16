// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export interface WishlistButtonProps { productId: string; }
export function WishlistButton({ productId }: WishlistButtonProps): ReactNode {
	const toggleLocal = useWishlistStore((state) => state.toggle);
	const has = useWishlistStore((state) => state.has(productId));
	const user = useAuthStore((state) => state.user);
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleClick = async (): Promise<void> => {
		if (!user) {
			router.push('/login');
			return;
		}
		// optimistic update
		toggleLocal(productId);
		setLoading(true);
		try {
			await api.post(`/wishlist/${productId}`);
		} catch (err) {
			// revert on error
			toggleLocal(productId);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button variant="secondary" onClick={handleClick} disabled={loading}>
			<Heart size={16} className={has ? 'text-danger' : 'text-text-primary'} />
			<span className="ml-2">{COPY.nav.wishlist}</span>
		</Button>
	);
}
