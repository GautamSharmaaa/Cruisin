// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import type { Review } from '@/types/product.types';

export interface ReviewSectionProps { reviews: Review[]; rating: number; count: number; }
export function ReviewSection({ reviews, rating, count }: ReviewSectionProps): ReactNode { return <section className="border-t border-border py-12"><h2 className="font-display text-2xl">{COPY.product.reviews}</h2><p className="mt-2 font-mono text-accent-gold">{rating.toFixed(1)} / 5 · {count}</p><div className="mt-8 space-y-6">{reviews.map((review) => <article key={review.id} className="border-b border-border-subtle pb-6"><p className="font-display text-lg">{review.title}</p><p className="mt-2 text-text-secondary">{review.body}</p><p className="mt-3 text-xs uppercase tracking-[0.12em] text-text-muted">{review.author}</p></article>)}</div></section>; }
