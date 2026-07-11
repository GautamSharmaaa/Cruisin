// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { CheckoutSuccess } from '@/components/checkout/checkout-success';

export interface CheckoutSuccessPageProps { searchParams: Promise<{ order?: string }>; }

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps): Promise<ReactNode> {
  const params = await searchParams;
  return <CheckoutSuccess orderId={params.order} />;
}
