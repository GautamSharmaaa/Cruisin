// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface FilterSidebarProps { activeCount: number; }
export function FilterSidebar({ activeCount }: FilterSidebarProps): ReactNode { const sizes = ['XS','S','M','L','XL']; const colors = ['Black','Ash','Carbon']; return <aside className="hidden w-72 shrink-0 border-r border-border-subtle p-6 lg:block"><h2 className="font-display text-xl">{COPY.shop.filters} {activeCount > 0 ? '(' + activeCount + ')' : ''}</h2><div className="mt-8 space-y-8"><section><h3 className="font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.size}</h3><div className="mt-3 flex flex-wrap gap-2">{sizes.map((size) => <button key={size} className="h-10 min-w-10 border border-border px-3 text-sm text-text-secondary hover:text-text-primary">{size}</button>)}</div></section><section><h3 className="font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">{COPY.product.color}</h3><div className="mt-3 flex flex-wrap gap-2">{colors.map((color) => <button key={color} className="h-10 border border-border px-3 text-sm text-text-secondary hover:text-text-primary">{color}</button>)}</div></section></div></aside>; }
