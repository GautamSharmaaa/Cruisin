// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { DataTable } from '@/components/dashboard/data-table';
import { COPY } from '@/constants/copy';
import { tableColumns } from '@/lib/table-data';

export interface ResourceTableProps {
  title: string;
  items: unknown[];
  isLoading: boolean;
}

const value = (item: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const candidate = item[key];
    if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') return String(candidate);
  }
  return COPY.table.draft;
};

export function ResourceTable({ title, items, isLoading }: ResourceTableProps): ReactNode {
  const objects = items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  const rows = isLoading ? [[COPY.common.loading, COPY.table.draft, COPY.table.today, COPY.table.review]] : objects.map((item) => [
    value(item, ['title', 'name', 'email', 'code', 'id', '_id']),
    value(item, ['orderStatus', 'paymentStatus', 'role', 'type', 'isActive']),
    value(item, ['createdAt', 'updatedAt', 'sortOrder']),
    COPY.table.edit
  ]);
  return <DataTable title={title} columns={tableColumns()} rows={rows} />;
}
