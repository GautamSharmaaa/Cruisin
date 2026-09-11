// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { InvoiceSettingsForm } from '@/components/invoices/invoice-settings-form';

export default function InvoiceSettingsPage(): ReactNode { return <div className="grid gap-6"><PageHeader eyebrow="Finance operations" title="Invoice settings" subtitle="Configure the seller identity and controls captured on future Cruisin invoices." /><InvoiceSettingsForm /></div>; }
