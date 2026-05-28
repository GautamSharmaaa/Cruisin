// Governed by .rules v1.0
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { formatPrice } from '@/lib/utils';
import { useCartStore, type CartItem as CartItemType } from '@/store/cartStore';

export interface CartItemProps { item: CartItemType; }
export function CartItem({ item }: CartItemProps): ReactNode { const updateQuantity = useCartStore((state) => state.updateQuantity); const removeItem = useCartStore((state) => state.removeItem); return <article className="grid grid-cols-[96px_1fr] gap-4 border-b border-border-subtle py-4"><div className="relative aspect-[3/4]"><Image src={item.product.images[0].url} alt={item.product.images[0].alt} fill sizes="96px" className="object-cover" /></div><div><h3 className="font-display text-lg">{item.product.title}</h3><p className="text-sm text-text-secondary">{item.size} / {item.color}</p><p className="mt-2 font-mono text-accent-gold">{formatPrice(item.price)}</p><div className="mt-4 flex items-center gap-2"><Button variant="secondary" onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity - 1)}>-</Button><span className="min-w-8 text-center">{item.quantity}</span><Button variant="secondary" onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity + 1)}>+</Button><Button variant="ghost" onClick={() => removeItem(item.product.id, item.variantId)}>{COPY.cart.remove}</Button></div></div></article>; }
