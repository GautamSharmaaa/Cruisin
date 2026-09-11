// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { AdminCard } from '@/components/dashboard/admin-ui';
import { Button } from '@/components/ui/button';
import { useInvoiceSettings } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { invoiceSettingsSchema, type InvoiceSettingsFormValue } from '@/lib/schemas';

interface SettingsFieldProps { label: string; error?: string; children: ReactNode; }
function SettingsField({ label, error, children }: SettingsFieldProps): ReactNode { return <label className="grid gap-2 text-[11px] uppercase tracking-[0.12em] text-text-muted"><span>{label}</span>{children}{error ? <span className="normal-case tracking-normal text-danger">{error}</span> : null}</label>; }
const inputClass = 'h-11 border border-border bg-background-input px-3 text-sm normal-case tracking-normal text-text-primary outline-none focus:border-accent-gold';

export function InvoiceSettingsForm(): ReactNode {
  const settings = useInvoiceSettings();
  const [notice, setNotice] = useState('');
  const form = useForm<InvoiceSettingsFormValue>({ resolver: zodResolver(invoiceSettingsSchema), defaultValues: { legalName: 'Cruisin', tradeName: 'CRUISIN', invoicePrefix: 'CR', registeredAddress: 'KV APPAREL 992/1, Gali No. 2, Kapashera Extention, Kapashera, New Delhi 110037, Near Mahadeep Public School, South West Delhi, Delhi, India', gstin: '07BZXPV5435K1ZB', state: 'Delhi', stateCode: '07', phone: '8287846203', email: '', footer: 'Thank you for shopping with Cruisin.', authorizedSignatory: '', signatureAssetUrl: '', bulkPdfLimit: 100 } });
  useEffect(() => { if (settings.data) form.reset(settings.data); }, [form, settings.data]);
  const save = form.handleSubmit(async (value): Promise<void> => {
    setNotice('Saving settings…');
    try { await api.patch('/admin/invoices/settings', value); setNotice('Saved. These values apply only to future invoice snapshots.'); await settings.refetch(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Invoice settings could not be saved.'); }
  });
  if (settings.isLoading) return <AdminCard><div className="h-80 animate-pulse bg-background-overlay" /></AdminCard>;
  return <section className="grid gap-6"><Link href="/invoices" className="inline-flex h-11 items-center text-sm text-text-secondary hover:text-accent-gold"><ArrowLeft size={16} className="mr-2" />Back to invoices</Link><AdminCard><div className="max-w-3xl"><h2 className="font-display text-2xl text-text-primary">Business identity</h2><p className="mt-3 text-sm leading-6 text-text-secondary">Saved details are copied into future invoices. Existing invoice records and PDFs are never rewritten when these settings change.</p></div><form onSubmit={(event) => void save(event)} className="mt-6 grid gap-5 md:grid-cols-2">
    <SettingsField label="Legal business name" error={form.formState.errors.legalName?.message}><input className={inputClass} {...form.register('legalName')} /></SettingsField>
    <SettingsField label="Trade name" error={form.formState.errors.tradeName?.message}><input className={inputClass} {...form.register('tradeName')} /></SettingsField>
    <SettingsField label="Invoice prefix" error={form.formState.errors.invoicePrefix?.message}><input className={inputClass} {...form.register('invoicePrefix')} /></SettingsField>
    <SettingsField label="GSTIN" error={form.formState.errors.gstin?.message}><input className={inputClass} {...form.register('gstin')} /></SettingsField>
    <SettingsField label="State" error={form.formState.errors.state?.message}><input className={inputClass} {...form.register('state')} /></SettingsField>
    <SettingsField label="State code" error={form.formState.errors.stateCode?.message}><input className={inputClass} {...form.register('stateCode')} /></SettingsField>
    <SettingsField label="Phone" error={form.formState.errors.phone?.message}><input className={inputClass} {...form.register('phone')} /></SettingsField>
    <SettingsField label="Email" error={form.formState.errors.email?.message}><input type="email" className={inputClass} {...form.register('email')} /></SettingsField>
    <SettingsField label="Registered address" error={form.formState.errors.registeredAddress?.message}><textarea rows={4} className="border border-border bg-background-input p-3 text-sm normal-case tracking-normal text-text-primary outline-none focus:border-accent-gold" {...form.register('registeredAddress')} /></SettingsField>
    <SettingsField label="Invoice footer" error={form.formState.errors.footer?.message}><textarea rows={4} className="border border-border bg-background-input p-3 text-sm normal-case tracking-normal text-text-primary outline-none focus:border-accent-gold" {...form.register('footer')} /></SettingsField>
    <SettingsField label="Authorized signatory" error={form.formState.errors.authorizedSignatory?.message}><input className={inputClass} {...form.register('authorizedSignatory')} /></SettingsField>
    <SettingsField label="Signature asset URL" error={form.formState.errors.signatureAssetUrl?.message}><input className={inputClass} {...form.register('signatureAssetUrl')} /></SettingsField>
    <SettingsField label="Maximum invoices per bulk PDF" error={form.formState.errors.bulkPdfLimit?.message}><input type="number" min={1} max={250} className={inputClass} {...form.register('bulkPdfLimit', { valueAsNumber: true })} /></SettingsField>
    <div className="flex items-end"><Button type="submit" disabled={form.formState.isSubmitting}><Save size={15} className="mr-2" />{form.formState.isSubmitting ? 'Saving…' : 'Save future invoice settings'}</Button></div>
  </form>{notice ? <p role="status" className="mt-5 border-l-2 border-accent-gold px-4 text-sm text-text-secondary">{notice}</p> : null}</AdminCard></section>;
}
