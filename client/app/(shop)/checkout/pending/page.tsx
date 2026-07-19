// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { CheckoutPending } from '@/components/checkout/checkout-pending';

export interface CheckoutPendingPageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutPendingPage({ searchParams }: CheckoutPendingPageProps): Promise<ReactNode> {
  const params = await searchParams;
  return <CheckoutPending orderId={params.order} />;
}
