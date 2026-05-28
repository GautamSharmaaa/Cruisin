// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface RecentlyViewedProps { }
export function RecentlyViewed(_props: RecentlyViewedProps): ReactNode { return <section className="px-6 pb-20 lg:px-20"><h2 className="font-display text-2xl">{COPY.product.recentlyViewed}</h2><p className="mt-3 text-text-secondary">{COPY.home.newsletterBody}</p></section>; }
