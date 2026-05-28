// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BreadcrumbItem { label: string; href: string; }
export interface BreadcrumbProps { items: BreadcrumbItem[]; }
export function Breadcrumb({ items }: BreadcrumbProps): ReactNode { return <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 font-body text-xs uppercase tracking-[0.12em] text-text-muted">{items.map((item, index) => <span key={item.href} className="flex gap-2"><Link className="hover:text-text-primary" href={item.href}>{item.label}</Link>{index < items.length - 1 ? <span>/</span> : null}</span>)}</nav>; }
