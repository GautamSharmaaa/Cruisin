// Governed by .rules v1.0
'use client';

import { Download } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
export interface DataTableProps { title: string; columns: string[]; rows: string[][]; }
export function DataTable({ title, columns, rows }: DataTableProps): ReactNode {
  const [query, setQuery] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = useMemo(() => rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())).sort((left, right) => left[sortIndex].localeCompare(right[sortIndex])), [query, rows, sortIndex]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const exportCsv = (): void => {
    const csv = [columns, ...filtered].map((row) => row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = title.toLowerCase().replace(/\s+/g, '-') + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return <section className="border border-border bg-background-elevated"><div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between"><h2 className="font-display text-xl">{title}</h2><div className="flex gap-3"><Input label={COPY.common.search} value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="secondary" onClick={exportCsv}><Download size={16} />{COPY.common.export}</Button><Button>{COPY.common.create}</Button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{columns.map((column, index) => <th key={column} className="border-b border-border p-4"><button onClick={() => setSortIndex(index)}>{column}</button></th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.join('-')} className="border-b border-border-subtle">{row.map((cell) => <td key={cell} className="p-4 text-text-secondary">{cell}</td>)}</tr>)}</tbody></table></div><div className="flex items-center justify-between p-4 text-sm text-text-secondary"><span>{page} / {pages}</span><div className="flex gap-2"><Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{COPY.table.previous}</Button><Button variant="secondary" disabled={page === pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>{COPY.table.next}</Button></div></div></section>;
}
