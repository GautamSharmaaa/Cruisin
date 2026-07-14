// Governed by .rules v1.0
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ColorSwatch } from '@/components/product/color-swatch';
import { SizeSelector } from '@/components/product/size-selector';
import { COPY } from '@/constants/copy';
import type { ProductVariant } from '@/types/product.types';

export interface VariantSelectorProps { variants: ProductVariant[]; onChange: (variant: ProductVariant | null) => void; onColorChange?: (variant: ProductVariant) => void; }

export function VariantSelector({ variants, onChange, onColorChange }: VariantSelectorProps): ReactNode {
  const enabledVariants = useMemo(() => variants.filter((variant) => variant.enabled !== false), [variants]);
  const colors = useMemo(() => Array.from(new Map(enabledVariants.map((variant) => [variant.color.trim().toLowerCase(), variant.color])).values()).map((color) => {
    const matches = enabledVariants.filter((variant) => variant.color.trim().toLowerCase() === color.trim().toLowerCase());
    return { color, representative: matches.find((variant) => variant.stock > 0) ?? matches[0], soldOut: matches.every((variant) => variant.stock <= 0) };
  }), [enabledVariants]);
  const [selectedColor, setSelectedColor] = useState<string>(colors.find((color) => !color.soldOut)?.color ?? colors[0]?.color ?? '');
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const availableForColor = enabledVariants.filter((variant) => variant.color.trim().toLowerCase() === selectedColor.trim().toLowerCase());

  const selectColor = (representative: ProductVariant): void => {
    setSelectedColor(representative.color);
    setSelected(null);
    onChange(null);
    onColorChange?.(representative);
  };
  const selectSize = (variant: ProductVariant): void => {
    setSelected(variant);
    onChange(variant);
  };

  return <div className="space-y-8">
    <section aria-labelledby="product-color-heading">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 id="product-color-heading" className="font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.color}</h3>
        {selectedColor ? <p className="border-l border-border pl-3 font-mono text-xs text-text-primary" aria-live="polite">{selectedColor}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">{colors.map(({ color, representative, soldOut }) => <ColorSwatch key={color.toLowerCase()} color={color} colorHex={representative.colorHex} active={selectedColor.toLowerCase() === color.toLowerCase()} soldOut={soldOut} onSelect={() => selectColor(representative)} />)}</div>
    </section>
    <section aria-labelledby="product-size-heading">
      <h3 id="product-size-heading" className="mb-3 font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.size}</h3>
      {availableForColor.length ? <SizeSelector variants={availableForColor} selected={selected?.id} onSelect={selectSize} /> : <p className="text-sm text-text-muted">No sizes are currently available for this color.</p>}
    </section>
  </div>;
}
