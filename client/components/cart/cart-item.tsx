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
  return <article className="grid min-w-0 grid-cols-[136px_minmax(0,1fr)] gap-4 border-b border-border-subtle py-4 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)] md:grid-cols-[140px_minmax(0,1fr)] md:gap-4 md:py-4">
    <div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={image?.url ?? '/cruisin-image-fallback.svg'} alt={image?.alt ?? item.product.title} fill sizes="(min-width:640px) 140px, 136px" className="object-cover" priority={priority} /></div>
    <div className="min-w-0">
      <h3 className="break-words text-sm font-medium leading-5 text-text-primary md:font-display md:text-lg md:font-normal">{item.product.title}</h3>
      <div className="mt-2 grid gap-1.5 text-xs text-text-secondary">
        <p><span className="text-text-muted">Size:</span> <span className="text-text-primary">{item.size}</span></p>
        <p className="flex items-center gap-2"><span className="text-text-muted">Colour:</span><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30 shadow-inner" style={{ backgroundColor: variant?.colorHex || '#777777' }} aria-hidden="true" /><span className="truncate text-text-primary">{item.color}</span></p>
      </div>
      {variant?.sku ? <p className="mt-1 hidden break-all font-mono text-xs text-text-muted md:block">{variant.sku}</p> : null}
      <p className="mt-1.5 font-mono text-sm text-accent-gold md:mt-2 md:text-base">{formatPrice(item.price)}</p>
      <p className="mt-2 hidden text-xs text-text-muted md:block">{COPY.cart.stockAvailable.replace('{count}', String(stock))}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-5 md:gap-3">
        <Button variant="secondary" className="h-9 w-9 px-0 text-base md:h-12 md:w-12 md:text-lg" aria-label={`Decrease ${item.product.title} ${item.color} ${item.size} quantity`} onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity - 1)}>-</Button>
        <span className="min-w-6 text-center text-sm md:min-w-8 md:text-base" aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span>
        <Button variant="secondary" className="h-9 w-9 px-0 text-base md:h-12 md:w-12 md:text-lg" disabled={atStockLimit} title={atStockLimit ? COPY.cart.stockLimit : undefined} aria-label={`Increase ${item.product.title} ${item.color} ${item.size} quantity`} onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity + 1)}>+</Button>
      </div>
      <Button variant="ghost" className="mt-1 h-9 w-fit min-w-0 justify-start px-0 text-left text-[9px] uppercase tracking-[0.16em] text-text-muted underline underline-offset-4 md:mt-3 md:h-10 md:text-[10px]" onClick={() => removeItem(item.product.id, item.variantId)}>{COPY.cart.remove}</Button>
      {atStockLimit ? <p className="mt-2 text-xs text-warning" aria-live="polite">{COPY.cart.stockLimit}</p> : null}
    </div>
  </article>;
}
