// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
export interface DataTableProps { title: string; columns: string[]; rows: string[][]; }
export function DataTable({ title, columns, rows }: DataTableProps): ReactNode { return <section className="border border-border bg-background-elevated"><div className="flex items-center justify-between border-b border-border p-4"><h2 className="font-display text-xl">{title}</h2><Button>{COPY.common.create}</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{columns.map((column) => <th key={column} className="border-b border-border p-4">{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.join('-')} className="border-b border-border-subtle">{row.map((cell) => <td key={cell} className="p-4 text-text-secondary">{cell}</td>)}</tr>)}</tbody></table></div></section>; }
