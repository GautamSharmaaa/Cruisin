// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/shared/modal';
import { COPY } from '@/constants/copy';
import { useSearch } from '@/hooks/useSearch';

export interface SearchModalProps { open: boolean; onOpenChange: (open: boolean) => void; }
export function SearchModal({ open, onOpenChange }: SearchModalProps): ReactNode { const { query, setQuery, results } = useSearch(); return <Modal open={open} onOpenChange={onOpenChange} title={COPY.nav.search}><div className="space-y-6"><Input label={COPY.nav.search} value={query} onChange={(event) => setQuery(event.target.value)} autoFocus /><div className="space-y-3">{results.map((product) => <Link key={product.id} href={'/product/' + product.slug} onClick={() => onOpenChange(false)} className="flex min-h-11 items-center gap-3 border-b border-border-subtle py-3 text-text-primary"><Search size={16} /><span>{product.title}</span></Link>)}</div></div></Modal>; }
