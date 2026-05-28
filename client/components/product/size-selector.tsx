// Governed by .rules v1.0
import type { ReactNode } from 'react';
import type { ProductVariant } from '@/types/product.types';

export interface SizeSelectorProps { variants: ProductVariant[]; selected?: string; onSelect: (variant: ProductVariant) => void; }
export function SizeSelector({ variants, selected, onSelect }: SizeSelectorProps): ReactNode { return <div className="flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.id} disabled={variant.stock === 0} onClick={() => onSelect(variant)} className={'relative h-11 min-w-11 border px-4 text-sm ' + (selected === variant.id ? 'border-accent-gold text-text-primary' : 'border-border text-text-secondary') + (variant.stock === 0 ? ' text-text-muted after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:bg-text-muted' : '')}>{variant.size}</button>)}</div>; }
