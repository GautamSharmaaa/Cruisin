'use client';

import { readSizeChart } from '@cruisin/contracts/product-size-chart';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/modal';
import { COPY } from '@/constants/copy';

export interface SizeGuideModalProps { guide?: string; productTitle: string; }

function chartLink(value: string): string | undefined {
  if (/^\/(?!\/)[^\\\s]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* The guide may be product measurements or fit notes. */ }
  return undefined;
}

export function SizeGuideModal({ guide, productTitle }: SizeGuideModalProps): ReactNode {
  const [open, setOpen] = useState(false);
  const value = guide?.trim();
  if (!value) return null;
  const href = chartLink(value);
  const chart = readSizeChart(value);
  const rows = chart?.rows.filter(row => row.some(cell => cell.trim())) ?? [];
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)}>{COPY.product.sizeGuide}</Button>
    <Modal open={open} onOpenChange={setOpen} title={COPY.product.sizeGuide + ' · ' + productTitle}>
      {href ? <a className="underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">Open size chart ↗</a> :
        chart ? <div className="overflow-x-auto" data-scroll-native>
          <table className="w-full text-left text-sm">
            <thead><tr>{chart.columns.map((cell,index) => <th key={index} scope="col" className="border-b border-border px-2 py-3">{cell || 'Column ' + (index + 1)}</th>)}</tr></thead>
            <tbody>{rows.map((row,index) => <tr key={index}>{row.map((cell,column) => column === 0
              ? <th key={column} scope="row" className="border-b border-border px-2 py-3">{cell}</th>
              : <td key={column} className="border-b border-border px-2 py-3">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div> : <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{value}</p>}
    </Modal>
  </>;
}
