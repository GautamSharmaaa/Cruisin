// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { DataTable } from '@/components/dashboard/data-table';
import { COPY } from '@/constants/copy';
export default function TablePage(): ReactNode { return <DataTable title={COPY.nav.categories} columns={['Name','Status','Updated','Actions']} rows={[[COPY.nav.categories,'Active','Today','Edit'],['Archive','Draft','Yesterday','Review']]} />; }
