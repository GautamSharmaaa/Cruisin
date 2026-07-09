// Governed by .rules v1.0
'use client';

import { AlertTriangle, CheckCircle2, Download, FileCheck2, FileUp, History, Play, RefreshCw, Settings, ShieldCheck, UploadCloud, XCircle } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiEnvelope<TData> { data: TData; }
interface CatalogueIssue { severity: 'error' | 'warning'; rowNumber?: number; productCode?: string; field?: string; message: string; }
interface CataloguePreview {
  headers: string[];
  rowCount: number;
  productGroupCount: number;
  previewGroups: Array<{ productCode: string; name: string; variantCount: number; totalStock: number; categorySuggestion: { raw: string; path: string[]; source: string }; collections: string[]; images: string[] }>;
  detectedCategories: Array<{ raw: string; path: string[]; source: string }>;
  detectedCollections: string[];
  validation: { valid: boolean; errors: CatalogueIssue[]; warnings: CatalogueIssue[] };
  summary: Record<string, unknown>;
}
interface CatalogueRecord { _id: string; filename: string; originalFilename?: string; status: string; rowCount?: number; productGroupCount?: number; createdProducts?: number; updatedProducts?: number; failedRows?: number; warningsCount?: number; createdAt?: string; completedAt?: string; }
interface CatalogueExportRecord { _id: string; filename: string; status: string; exportType?: string; productCount?: number; rowCount?: number; createdAt?: string; completedAt?: string; }
interface CatalogueDashboardDto {
  totals: { imports: number; exports: number; productsImported: number; productsUpdated: number; variantsImported: number; categoriesCreated: number; collectionsCreated: number; failedRows: number };
  lastImport?: CatalogueRecord | null;
  lastExport?: CatalogueExportRecord | null;
  imports: CatalogueRecord[];
  exports: CatalogueExportRecord[];
  settings: { autoGenerateOnProductUpdate?: boolean; isCatalogueStale?: boolean; lastGeneratedAt?: string; defaultImportMode?: string; defaultExportType?: string };
}

const importModes = [
  ['upsert', 'Upsert'],
  ['create-only', 'Create Only'],
  ['update-only', 'Update Only'],
  ['stock-only', 'Stock Only'],
  ['prices-only', 'Prices Only'],
  ['media-only', 'Media Only'],
  ['taxonomy-only', 'Taxonomy Only']
] as const;

const steps = ['Upload', 'Preview', 'Map', 'Validate', 'Dry Run', 'Confirm', 'Result'] as const;

const downloadBlob = (data: string, filename: string, type = 'text/csv;charset=utf-8;'): void => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const formatDate = (value?: string): string => value ? new Date(value).toLocaleString() : 'Never';
const numberValue = (value: unknown): number => typeof value === 'number' ? value : 0;

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: 'warning' | 'success' | 'danger' }): ReactNode => (
  <div className="border border-border bg-background-elevated p-4">
    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">{label}</p>
    <p className={cn('mt-2 font-mono text-2xl text-text-primary', tone === 'warning' && 'text-warning', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger')}>{value}</p>
  </div>
);

const Panel = ({ title, icon, children, action }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }): ReactNode => (
  <section className="border border-border bg-background-elevated p-5 shadow-lg">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg text-text-primary">{icon}{title}</h2>
      {action}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const IssueList = ({ issues, title }: { issues: CatalogueIssue[]; title: string }): ReactNode => (
  <div className="border border-border bg-background-primary p-4">
    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{title}</p>
    <div className="mt-3 max-h-56 overflow-auto">
      {issues.length === 0 ? <p className="text-sm text-text-secondary">None</p> : issues.slice(0, 50).map((issue, index) => (
        <div key={index} className="grid gap-1 border-t border-border py-3 text-sm first:border-t-0 first:pt-0">
          <p className={issue.severity === 'error' ? 'text-danger' : 'text-warning'}>{issue.message}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">{[issue.productCode, issue.field, issue.rowNumber ? 'Row ' + issue.rowNumber : ''].filter(Boolean).join(' | ')}</p>
        </div>
      ))}
    </div>
  </div>
);

export function CatalogueDashboard(): ReactNode {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState(',');
  const [importMode, setImportMode] = useState('upsert');
  const [importId, setImportId] = useState('');
  const [preview, setPreview] = useState<CataloguePreview | null>(null);
  const [dryRun, setDryRun] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);

  const dashboard = useQuery({ queryKey: ['admin', 'catalogues'], queryFn: async (): Promise<CatalogueDashboardDto> => { const response = await api.get<ApiEnvelope<CatalogueDashboardDto>>('/admin/catalogues/dashboard'); return response.data.data; } });

  const upload = useMutation({
    mutationFn: async (): Promise<{ importId: string; parsed: CataloguePreview }> => {
      if (!file) throw new Error('Choose a CSV file first.');
      const form = new FormData();
      form.append('file', file);
      form.append('delimiter', delimiter);
      const response = await api.post<ApiEnvelope<{ importId: string; parsed: CataloguePreview }>>('/admin/catalogues/import/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data.data;
    },
    onSuccess: (data) => {
      setImportId(data.importId);
      setPreview(data.parsed);
      setDryRun(null);
      setResult(null);
      setStep(1);
      setNotice({ tone: 'success', message: 'Catalogue preview is ready.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalogues'] });
    },
    onError: (error) => setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
  });

  const dryRunMutation = useMutation({
    mutationFn: async (): Promise<Record<string, unknown>> => {
      const response = await api.post<ApiEnvelope<Record<string, unknown>>>('/admin/catalogues/import/dry-run', { importId, importMode });
      return response.data.data;
    },
    onSuccess: (data) => { setDryRun(data); setStep(4); setNotice({ tone: 'success', message: 'Dry run completed.' }); },
    onError: (error) => setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Dry run failed.' })
  });

  const confirm = useMutation({
    mutationFn: async (): Promise<Record<string, unknown>> => {
      const response = await api.post<ApiEnvelope<Record<string, unknown>>>('/admin/catalogues/import/confirm', { importId, importMode });
      return response.data.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep(6);
      setNotice({ tone: 'success', message: 'Catalogue import completed.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalogues'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
    },
    onError: (error) => setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Import failed.' })
  });

  const generateExport = useMutation({
    mutationFn: async (): Promise<{ exportId: string; filename: string; csv: string }> => {
      const response = await api.post<ApiEnvelope<{ exportId: string; filename: string; csv: string }>>('/admin/catalogues/export', { exportType: 'full' });
      return response.data.data;
    },
    onSuccess: (data) => {
      downloadBlob(data.csv, data.filename);
      setNotice({ tone: 'success', message: 'Catalogue export generated.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalogues'] });
    },
    onError: (error) => setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Export failed.' })
  });

  const settings = useMutation({
    mutationFn: async (enabled: boolean): Promise<void> => { await api.patch('/admin/catalogues/settings', { autoGenerateOnProductUpdate: enabled }); },
    onSuccess: async () => { setNotice({ tone: 'success', message: 'Catalogue settings saved.' }); await queryClient.invalidateQueries({ queryKey: ['admin', 'catalogues'] }); }
  });

  const totals = dashboard.data?.totals;
  const validation = preview?.validation;
  const canConfirm = Boolean(importId && dryRun && validation?.errors.length === 0);
  const uploadMeta = useMemo(() => file ? { name: file.name, size: Math.round(file.size / 1024) + ' KB' } : null, [file]);

  const downloadLatest = async (): Promise<void> => {
    const latest = dashboard.data?.lastExport?._id;
    if (!latest) return;
    const response = await api.get('/admin/catalogues/exports/' + latest + '/download', { responseType: 'blob' });
    const text = await response.data.text();
    downloadBlob(text, dashboard.data?.lastExport?.filename ?? 'cruisin_catalogue.csv');
  };

  const downloadErrors = async (id: string): Promise<void> => {
    const response = await api.get('/admin/catalogues/imports/' + id + '/errors.csv', { responseType: 'blob' });
    const text = await response.data.text();
    downloadBlob(text, 'catalogue-import-errors.csv');
  };

  return <div className="grid gap-6">
    <PageHeader eyebrow="Catalogues" title="Catalogues" subtitle="Import supplier CSV files, validate grouped products, and generate the current catalogue snapshot." action={<div className="flex gap-3"><Button variant="secondary" onClick={() => void downloadLatest()} disabled={!dashboard.data?.lastExport}><Download size={15} className="mr-2" />Latest</Button><Button onClick={() => generateExport.mutate()} disabled={generateExport.isPending}><RefreshCw size={15} className="mr-2" />Generate</Button></div>} />

    {notice ? <div className={cn('border p-4 text-sm', notice.tone === 'success' && 'border-success text-success', notice.tone === 'error' && 'border-danger text-danger', notice.tone === 'info' && 'border-border text-text-secondary')}>{notice.message}</div> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Imports" value={totals?.imports ?? 0} />
      <Stat label="Products Created" value={totals?.productsImported ?? 0} tone="success" />
      <Stat label="Products Updated" value={totals?.productsUpdated ?? 0} />
      <Stat label="Failed Rows" value={totals?.failedRows ?? 0} tone={(totals?.failedRows ?? 0) > 0 ? 'danger' : undefined} />
      <Stat label="Variants Imported" value={totals?.variantsImported ?? 0} />
      <Stat label="Categories Created" value={totals?.categoriesCreated ?? 0} />
      <Stat label="Collections Created" value={totals?.collectionsCreated ?? 0} />
      <Stat label="Catalogue State" value={dashboard.data?.settings?.isCatalogueStale ? 'Stale' : 'Current'} tone={dashboard.data?.settings?.isCatalogueStale ? 'warning' : 'success'} />
    </div>

    <Panel title="Import Catalogue" icon={<FileUp size={18} />} action={<div className="flex flex-wrap gap-2">{steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={cn('h-9 border px-3 font-mono text-[10px] uppercase tracking-[0.12em]', step === index ? 'border-accent-gold text-accent-gold' : 'border-border text-text-muted')}>{label}</button>)}</div>}>
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-4">
          <label className="grid min-h-44 place-items-center border border-dashed border-border bg-background-primary p-5 text-center transition hover:border-accent-gold">
            <UploadCloud className="text-accent-gold" size={28} />
            <span className="mt-3 text-sm text-text-primary">{uploadMeta?.name ?? 'Choose catalogue CSV'}</span>
            <span className="mt-1 text-xs text-text-muted">{uploadMeta?.size ?? 'UTF-8 CSV, up to 10 MB'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
            Delimiter
            <select value={delimiter} onChange={(event) => setDelimiter(event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm text-text-primary">
              <option value=",">Comma</option>
              <option value=";">Semicolon</option>
              <option value={'\t'}>Tab</option>
            </select>
          </label>
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
            Import Mode
            <select value={importMode} onChange={(event) => setImportMode(event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm text-text-primary">
              {importModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}><FileCheck2 size={15} className="mr-2" />Upload Preview</Button>
          <Button variant="secondary" onClick={() => dryRunMutation.mutate()} disabled={!importId || dryRunMutation.isPending}><Play size={15} className="mr-2" />Dry Run</Button>
          <Button variant="danger" onClick={() => confirm.mutate()} disabled={!canConfirm || confirm.isPending}><ShieldCheck size={15} className="mr-2" />Confirm Import</Button>
        </div>

        <div className="grid gap-4">
          {preview ? <>
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Rows" value={preview.rowCount} />
              <Stat label="Product Codes" value={preview.productGroupCount} />
              <Stat label="Columns" value={preview.headers.length} />
              <Stat label="Warnings" value={preview.validation.warnings.length} tone={preview.validation.warnings.length ? 'warning' : undefined} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <IssueList title="Errors" issues={preview.validation.errors} />
              <IssueList title="Warnings" issues={preview.validation.warnings} />
            </div>
            <div className="overflow-auto border border-border bg-background-primary">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-text-muted"><tr><th className="p-3">Product</th><th className="p-3">Variants</th><th className="p-3">Stock</th><th className="p-3">Category</th><th className="p-3">Collections</th></tr></thead>
                <tbody>{preview.previewGroups.map((group) => <tr key={group.productCode} className="border-b border-border last:border-b-0"><td className="p-3"><p className="text-text-primary">{group.name}</p><p className="font-mono text-xs text-text-muted">{group.productCode}</p></td><td className="p-3">{group.variantCount}</td><td className="p-3">{group.totalStock}</td><td className="p-3">{group.categorySuggestion.path.join(' > ')}</td><td className="p-3">{group.collections.join(', ') || 'None'}</td></tr>)}</tbody>
              </table>
            </div>
          </> : <div className="grid min-h-80 place-items-center border border-border bg-background-primary p-8 text-center text-sm text-text-secondary">Upload a catalogue to begin.</div>}
          {dryRun ? <div className="grid gap-3 border border-success/50 bg-background-primary p-4"><p className="flex items-center gap-2 text-success"><CheckCircle2 size={17} />Dry run ready</p><div className="grid gap-3 md:grid-cols-4"><Stat label="Products Create" value={numberValue((dryRun.summary as Record<string, unknown>)?.productsToCreate)} /><Stat label="Products Update" value={numberValue((dryRun.summary as Record<string, unknown>)?.productsToUpdate)} /><Stat label="Variants Create" value={numberValue((dryRun.summary as Record<string, unknown>)?.variantsToCreate)} /><Stat label="Variants Update" value={numberValue((dryRun.summary as Record<string, unknown>)?.variantsToUpdate)} /></div></div> : null}
          {result ? <div className="grid gap-3 border border-accent-gold/50 bg-background-primary p-4"><p className="flex items-center gap-2 text-accent-gold"><CheckCircle2 size={17} />Import complete</p><div className="grid gap-3 md:grid-cols-4"><Stat label="Created" value={numberValue(result.createdProducts)} /><Stat label="Updated" value={numberValue(result.updatedProducts)} /><Stat label="Variants Created" value={numberValue(result.createdVariants)} /><Stat label="Variants Updated" value={numberValue(result.updatedVariants)} /></div></div> : null}
        </div>
      </div>
    </Panel>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Export" icon={<Download size={18} />} action={<Button onClick={() => generateExport.mutate()} disabled={generateExport.isPending}><Download size={15} className="mr-2" />Full CSV</Button>}>
        <div className="grid gap-3 text-sm text-text-secondary">
          <p>Last export: {formatDate(dashboard.data?.lastExport?.completedAt ?? dashboard.data?.lastExport?.createdAt)}</p>
          <p>Rows: {dashboard.data?.lastExport?.rowCount ?? 0}</p>
          <p>Last generated: {formatDate(dashboard.data?.settings?.lastGeneratedAt)}</p>
          <label className="flex items-center justify-between gap-4 border border-border bg-background-primary p-4 text-text-primary">
            <span className="flex items-center gap-2"><Settings size={16} />Auto-generate after catalogue changes</span>
            <input type="checkbox" checked={Boolean(dashboard.data?.settings?.autoGenerateOnProductUpdate)} onChange={(event) => settings.mutate(event.target.checked)} />
          </label>
        </div>
      </Panel>
      <Panel title="Import History" icon={<History size={18} />}>
        <div className="grid gap-3">{(dashboard.data?.imports ?? []).slice(0, 8).map((item) => <div key={item._id} className="grid gap-2 border border-border bg-background-primary p-4 text-sm md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-text-primary">{item.originalFilename ?? item.filename}</p><p className="text-xs text-text-muted">{item.status} | {item.rowCount ?? 0} rows | {formatDate(item.createdAt)}</p></div><Button variant="secondary" onClick={() => void downloadErrors(item._id)}><AlertTriangle size={14} className="mr-2" />Report</Button></div>)}</div>
      </Panel>
    </div>

    <Panel title="Export History" icon={<FileCheck2 size={18} />}>
      <div className="grid gap-3">{(dashboard.data?.exports ?? []).slice(0, 8).map((item) => <div key={item._id} className="grid gap-2 border border-border bg-background-primary p-4 text-sm md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-text-primary">{item.filename}</p><p className="text-xs text-text-muted">{item.status} | {item.rowCount ?? 0} rows | {formatDate(item.createdAt)}</p></div><Button variant="secondary" onClick={() => void api.get('/admin/catalogues/exports/' + item._id + '/download', { responseType: 'blob' }).then(async (response) => downloadBlob(await response.data.text(), item.filename))}><Download size={14} className="mr-2" />Download</Button></div>)}</div>
    </Panel>
  </div>;
}
