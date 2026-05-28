// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useCartStore } from '@/store/cartStore';
import type { Product, ProductVariant } from '@/types/product.types';

export interface AddToCartButtonProps { product: Product; variant: ProductVariant | null; }
export function AddToCartButton({ product, variant }: AddToCartButtonProps): ReactNode { const addItem = useCartStore((state) => state.addItem); const disabled = !variant || variant.stock === 0; return <Button className="w-full" disabled={disabled} onClick={() => variant ? addItem({ product, variantId: variant.id, size: variant.size, color: variant.color, quantity: 1, price: variant.price }) : undefined}>{disabled ? COPY.product.selectSize : COPY.product.add}</Button>; }
