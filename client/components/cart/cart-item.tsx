// Governed by .rules v1.0
'use client';

import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { availableVariantStock } from '@/lib/cart-quantity';
import { formatPrice } from '@/lib/utils';
import { SafeImage } from '@/components/shared/safe-image';
import { useCartStore, type CartItem as CartItemType } from '@/store/cartStore';

export interface CartItemProps { item: CartItemType; priority?: boolean; }
export function CartItem({ item, priority = false }: CartItemProps): ReactNode {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const variant = item.product.variants.find((candidate) => candidate.id === item.variantId);
  const image = variant?.images[0] ?? item.product.images[0];
  const stock = availableVariantStock(item.product, item.variantId);
  const atStockLimit = stock <= 0 || item.quantity >= stock;
  useEffect(() => {
    if (item.quantity > stock) updateQuantity(item.product.id, item.variantId, stock);
  }, [item.product.id, item.quantity, item.variantId, stock, updateQuantity]);
  return <article className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-border-subtle py-4 sm:grid-cols-[96px_minmax(0,1fr)]"><div className="relative aspect-[3/4]"><SafeImage src={image?.url ?? '/cruisin-image-fallback.svg'} alt={image?.alt ?? item.product.title} fill sizes="(min-width:640px) 96px, 80px" className="object-cover" priority={priority} /></div><div className="min-w-0"><h3 className="break-words font-display text-lg">{item.product.title}</h3><p className="text-sm text-text-secondary">{item.size} / {item.color}</p>{variant?.sku ? <p className="mt-1 break-all font-mono text-xs text-text-muted">{variant.sku}</p> : null}<p className="mt-2 font-mono text-accent-gold">{formatPrice(item.price)}</p><p className="mt-2 text-xs text-text-muted">{COPY.cart.stockAvailable.replace('{count}', String(stock))}</p><div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="secondary" className="px-4" aria-label={`Decrease ${item.product.title} ${item.color} ${item.size} quantity`} onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity - 1)}>-</Button><span className="min-w-8 text-center" aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span><Button variant="secondary" className="px-4" disabled={atStockLimit} title={atStockLimit ? COPY.cart.stockLimit : undefined} aria-label={`Increase ${item.product.title} ${item.color} ${item.size} quantity`} onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity + 1)}>+</Button><Button variant="ghost" className="px-3" onClick={() => removeItem(item.product.id, item.variantId)}>{COPY.cart.remove}</Button></div>{atStockLimit ? <p className="mt-2 text-xs text-warning" aria-live="polite">{COPY.cart.stockLimit}</p> : null}</div></article>;
}
