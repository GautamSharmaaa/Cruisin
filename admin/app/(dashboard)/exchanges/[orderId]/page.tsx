// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ExchangeOrderReview } from '@/components/logistics/exchange-order-review';

export interface ExchangeOrderPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function ExchangeOrderPage({ params }: ExchangeOrderPageProps): Promise<ReactNode> {
  const { orderId } = await params;
  return <ExchangeOrderReview orderId={orderId} />;
}
