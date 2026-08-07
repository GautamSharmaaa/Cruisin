// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export interface CheckoutFailurePageProps { searchParams: Promise<{ order?: string; payment?: string; reason?: string }>; }

export default async function CheckoutFailurePage({ searchParams }: CheckoutFailurePageProps): Promise<ReactNode> {
  const params = await searchParams;
  const wasCancelled = params.reason === 'cancelled';
  return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{params.order ?? params.payment ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{wasCancelled ? 'Payment cancelled' : COPY.checkout.failure}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{wasCancelled ? 'The payment window was closed. No payment was collected and the unpaid order has been cancelled.' : COPY.checkout.failureBody}</p><Link href={ROUTES.checkout} className="mt-8 inline-flex h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]">{COPY.checkout.retry}</Link></main>;
}
