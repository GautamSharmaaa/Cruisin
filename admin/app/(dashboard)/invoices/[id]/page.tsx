// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { InvoiceDetail } from '@/components/invoices/invoice-detail';

export interface InvoiceDetailPageProps { params: Promise<{ id: string }>; }
export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps): Promise<ReactNode> { const { id } = await params; return <InvoiceDetail id={id} />; }
