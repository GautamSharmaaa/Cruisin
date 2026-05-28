// Governed by .rules v1.0
'use client';

import { useState, type ReactNode } from 'react';
import { ColorSwatch } from '@/components/product/color-swatch';
import { SizeSelector } from '@/components/product/size-selector';
import { COPY } from '@/constants/copy';
import type { ProductVariant } from '@/types/product.types';

export interface VariantSelectorProps { variants: ProductVariant[]; onChange: (variant: ProductVariant | null) => void; }
export function VariantSelector({ variants, onChange }: VariantSelectorProps): ReactNode { const [selected, setSelected] = useState<ProductVariant | null>(null); const colors = Array.from(new Map(variants.map((variant) => [variant.color, variant])).values()); const select = (variant: ProductVariant): void => { setSelected(variant); onChange(variant); }; return <div className="space-y-8"><section><h3 className="mb-3 font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.color}</h3><div className="flex flex-wrap gap-2">{colors.map((variant) => <ColorSwatch key={variant.color} color={variant.color} colorHex={variant.colorHex} active={selected?.color === variant.color} onSelect={() => select(variant)} />)}</div></section><section><h3 className="mb-3 font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.size}</h3><SizeSelector variants={variants} selected={selected?.id} onSelect={select} /></section></div>; }
