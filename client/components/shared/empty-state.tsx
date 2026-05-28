// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyStateProps { title: string; body: string; cta: string; href: string; }
export function EmptyState({ title, body, cta, href }: EmptyStateProps): ReactNode { return <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center"><div className="mb-8 h-24 w-16 border border-accent-gold shadow-gold" aria-hidden="true" /><h2 className="font-display text-2xl text-text-primary">{title}</h2><p className="mt-3 text-base text-text-secondary">{body}</p><Link className="mt-8 inline-flex h-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110 active:scale-[0.98]" href={href}>{cta}</Link></div>; }
