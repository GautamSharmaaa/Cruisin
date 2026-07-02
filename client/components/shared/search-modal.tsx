// Governed by .rules v1.0
'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/shared/modal';
import { COPY } from '@/constants/copy';
import { useSearch } from '@/hooks/useSearch';

export interface SearchModalProps { open: boolean; onOpenChange: (open: boolean) => void; }
export function SearchModal({ open, onOpenChange }: SearchModalProps): ReactNode {
  const router = useRouter();
  const { query, setQuery, results } = useSearch();
  const hasQuery = query.trim().length > 0;

  const closeAndNavigate = (href: string): void => {
    onOpenChange(false);
    router.push(href);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!hasQuery) return;
    closeAndNavigate('/shop?q=' + encodeURIComponent(query.trim()));
  };

  return <Modal open={open} onOpenChange={onOpenChange} title={COPY.nav.search}><form className="space-y-6" onSubmit={onSubmit}><Input label={COPY.nav.search} value={query} onChange={(event) => setQuery(event.target.value)} autoFocus /><div className="space-y-3">{results.map((product) => <button key={product.id} type="button" onClick={() => closeAndNavigate('/product/' + product.slug)} className="flex min-h-11 w-full items-center gap-3 border-b border-border-subtle py-3 text-left text-text-primary transition hover:text-accent-gold"><Search size={16} /><span>{product.title}</span></button>)}{hasQuery && results.length === 0 ? <p className="border border-border-subtle px-4 py-5 text-sm text-text-secondary" role="status">No products found.</p> : null}</div></form></Modal>;
}
