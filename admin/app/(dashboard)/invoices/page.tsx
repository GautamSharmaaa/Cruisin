// Governed by .rules v1.0
import { Settings2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { InvoiceManager } from '@/components/invoices/invoice-manager';
import { COPY } from '@/constants/copy';

export default function InvoicesPage(): ReactNode {
  return <div className="grid gap-6"><PageHeader eyebrow={COPY.invoices.eyebrow} title={COPY.invoices.title} subtitle={COPY.invoices.subtitle} action={<Link href="/invoices/settings" className="inline-flex h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.12em] transition hover:border-accent-gold hover:text-accent-gold"><Settings2 size={15} className="mr-2" />{COPY.invoices.settings}</Link>} /><InvoiceManager /></div>;
}
