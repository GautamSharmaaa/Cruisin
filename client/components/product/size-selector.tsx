// Governed by .rules v1.0
import type { ReactNode } from 'react';
import type { ProductVariant } from '@/types/product.types';
import { uniqueVariantsBySize } from '@/lib/variant-utils';

export interface SizeSelectorProps { variants: ProductVariant[]; selected?: string; onSelect: (variant: ProductVariant) => void; }

export function SizeSelector({ variants, selected, onSelect }: SizeSelectorProps): ReactNode {
  const uniqueVariants = uniqueVariantsBySize(variants);
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Available sizes">{uniqueVariants.map((variant) => {
    const unavailable = variant.enabled === false || variant.stock <= 0;
    return <button type="button" key={variant.id} disabled={unavailable} aria-label={unavailable ? `Size ${variant.size} — sold out` : `Size ${variant.size}`} aria-pressed={selected === variant.id} onClick={() => onSelect(variant)} className={'relative h-11 min-w-11 border px-4 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ' + (selected === variant.id ? 'border-accent-gold text-text-primary shadow-gold' : 'border-border text-text-secondary hover:border-border-strong') + (unavailable ? ' cursor-not-allowed text-text-muted after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:bg-text-muted' : '')}>{variant.size}</button>;
  })}</div>;
}
