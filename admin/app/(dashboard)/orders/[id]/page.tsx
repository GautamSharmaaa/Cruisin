// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { OrderDetailClient } from '@/components/dashboard/order-detail-client';

export interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps): Promise<ReactNode> {
  const { id } = await params;
  return <OrderDetailClient id={id} />;
}
