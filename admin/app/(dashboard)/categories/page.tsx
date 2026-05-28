// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { DataTable } from '@/components/dashboard/data-table';
import { COPY } from '@/constants/copy';
import { tableColumns, tableRows } from '@/lib/table-data';
export default function TablePage(): ReactNode { return <DataTable title={COPY.nav.categories} columns={tableColumns()} rows={tableRows(COPY.nav.categories)} />; }
