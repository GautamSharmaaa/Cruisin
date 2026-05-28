// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface FlashSaleProps { }
export function FlashSale(_props: FlashSaleProps): ReactNode { return <section className="border-y border-border bg-background-elevated px-6 py-12 text-center lg:px-20"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.home.flashSale}</p><div className="mt-4 grid grid-cols-4 gap-px text-center font-mono text-2xl text-text-primary"><span>02</span><span>11</span><span>48</span><span>09</span></div></section>; }
