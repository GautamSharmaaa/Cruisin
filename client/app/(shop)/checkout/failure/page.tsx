// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export interface CheckoutFailurePageProps { searchParams: Promise<{ order?: string; payment?: string }>; }

export default async function CheckoutFailurePage({ searchParams }: CheckoutFailurePageProps): Promise<ReactNode> {
  const params = await searchParams;
  return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{params.order ?? params.payment ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.failure}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.failureBody}</p><Button className="mt-8"><Link href={ROUTES.checkout}>{COPY.checkout.retry}</Link></Button></main>;
}
