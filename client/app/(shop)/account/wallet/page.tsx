// Governed by .rules v1.0
'use client';

import { ArrowDownLeft, ArrowUpRight, LockKeyhole, WalletCards } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCustomerWallet } from '@/hooks/useReturns';
import { formatPrice } from '@/lib/utils';

const date = (value: string): string => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function WalletPage(): ReactNode {
  const wallet = useCustomerWallet();
  return <main className="px-5 py-28 sm:px-6 lg:px-20 lg:py-36"><section className="mx-auto max-w-[1000px]"><header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">Private balance</p><h1 className="mt-4 font-display text-4xl">Cruisin Wallet</h1><p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">Refund credits live here now. The same auditable wallet is ready for future membership benefits.</p></div><Link href="/account/returns" className="inline-flex min-h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em]">My returns</Link></header>
    {wallet.isLoading ? <p className="mt-8 text-sm text-text-secondary">Loading secure wallet…</p> : null}{wallet.error ? <p role="alert" className="mt-8 text-sm text-danger">{wallet.error.message}</p> : null}
    {wallet.data ? <><section className="mt-8 overflow-hidden border border-border bg-background-elevated"><div className="bg-gradient-to-br from-accent-gold/20 via-background-elevated to-background-primary p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><WalletCards className="h-7 w-7 text-accent-gold" /><span className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-success"><LockKeyhole className="h-4 w-4" />{wallet.data.status}</span></div><p className="mt-10 text-xs uppercase tracking-[0.14em] text-text-muted">Available balance</p><p className="mt-2 font-mono text-4xl text-text-primary sm:text-5xl">{formatPrice(wallet.data.availableBalance)}</p><div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm"><div><p className="text-text-muted">Lifetime credits</p><p className="mt-1 font-mono">{formatPrice(wallet.data.totalCredited)}</p></div><div><p className="text-text-muted">Lifetime used</p><p className="mt-1 font-mono">{formatPrice(wallet.data.totalDebited)}</p></div></div></div></section>
      <section className="mt-8"><h2 className="font-display text-2xl">Wallet activity</h2>{wallet.data.entries.length ? <ol className="mt-5 grid gap-3">{wallet.data.entries.map((entry) => <li key={entry.id} className="flex min-h-20 items-center gap-4 border border-border bg-background-elevated p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${entry.direction === 'credit' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{entry.direction === 'credit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-text-primary">{entry.description}</p><p className="mt-1 text-xs text-text-muted">{entry.sourceReference} · {date(entry.createdAt)}</p></div><p className={`font-mono text-sm ${entry.direction === 'credit' ? 'text-success' : 'text-text-primary'}`}>{entry.direction === 'credit' ? '+' : '−'}{formatPrice(entry.amount)}</p></li>)}</ol> : <div className="mt-5 border border-border bg-background-elevated p-8 text-center text-sm text-text-secondary">No wallet activity yet. A wallet refund will appear here immediately after the admin initiates it.</div>}</section></> : null}
  </section></main>;
}
