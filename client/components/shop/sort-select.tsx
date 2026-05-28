// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface SortSelectProps { value: string; onChange: (value: string) => void; }
export function SortSelect({ value, onChange }: SortSelectProps): ReactNode { return <label className="text-xs uppercase tracking-[0.12em] text-text-secondary">{COPY.shop.sort}<select value={value} onChange={(event) => onChange(event.target.value)} className="ml-3 h-11 border border-border bg-background-input px-3 text-text-primary"><option value="newest">Newest</option><option value="price-asc">Price low-high</option><option value="price-desc">Price high-low</option><option value="best-selling">Best selling</option><option value="top-rated">Top rated</option></select></label>; }
