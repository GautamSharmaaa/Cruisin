// Governed by .rules v1.0
import { COPY } from '@/constants/copy';

export const tableColumns = (): string[] => [...COPY.table.columns];

export const tableRows = (title: string): string[][] => [
  [title, COPY.table.active, COPY.table.today, COPY.table.edit],
  [COPY.table.archive, COPY.table.draft, COPY.table.yesterday, COPY.table.review]
];
