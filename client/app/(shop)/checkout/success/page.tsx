// Governed by .rules v1.0
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export interface CheckoutSuccessPageProps { searchParams: Promise<{ order?: string }>; }
export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps): Promise<ReactNode> { const params = await searchParams; return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-5xl">{COPY.checkout.success}</h1><p className="mt-4 text-text-secondary">{params.order ?? COPY.checkout.pendingOrder}</p><Button className="mt-8"><Link href={ROUTES.orders}>{COPY.account.orders}</Link></Button></main>; }
