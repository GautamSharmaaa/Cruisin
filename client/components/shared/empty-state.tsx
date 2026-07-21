// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RevolvingBag } from '@/components/shared/revolving-bag';

export interface EmptyStateProps { title: string; body: string; cta: string; href: string; }

export function EmptyState({ title, body, cta, href }: EmptyStateProps): ReactNode {
  return <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center sm:py-20"><RevolvingBag /><h2 className="mt-5 font-display text-3xl text-text-primary sm:text-4xl">{title}</h2><p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary sm:text-base">{body}</p><Link className="mt-7 inline-flex min-h-11 items-center justify-center bg-accent-gold px-7 font-body text-xs font-medium uppercase tracking-[0.08em] text-text-inverse shadow-gold transition hover:brightness-110 active:scale-[0.98]" href={href}>{cta}</Link></div>;
}
