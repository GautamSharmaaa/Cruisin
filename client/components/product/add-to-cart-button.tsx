// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { addProductToCart } from '@/lib/meta-actions';
import { useCartStore } from '@/store/cartStore';
import type { Product, ProductVariant } from '@/types/product.types';

export interface AddToCartButtonProps { product: Product; variant: ProductVariant | null; quantity?:number; }
export function AddToCartButton({ product, variant, quantity=1 }: AddToCartButtonProps): ReactNode { const addItem = useCartStore((state) => state.addItem); const disabled = !variant || variant.stock < quantity || variant.enabled === false; return <Button className="w-full pdp-add-to-cart" variant="secondary" disabled={disabled} onClick={() => { if (variant) addProductToCart({ product, variant, quantity, addItem }); }}>{disabled ? COPY.product.selectSize : COPY.product.add}</Button>; }
