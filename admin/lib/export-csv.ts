// Governed by .rules v1.0
export type CsvRow = Record<string, string | number | boolean | null | undefined> | Array<string | number | boolean | null | undefined>;

export const csvCell = (value: string | number | boolean | null | undefined): string => {
  const text = String(value ?? '');
  const spreadsheetSafe = typeof value === 'string' && (/^[\t\r]/.test(text) || /^[ ]*[=+\-@]/.test(text)) ? "'" + text : text;
  return '"' + spreadsheetSafe.replaceAll('"', '""') + '"';
};

export const rowsToCsv = (rows: CsvRow[]): string => {
  if (rows.length === 0) return '';
  const first = rows[0];
  const normalized = Array.isArray(first)
    ? rows.map((row) => Array.isArray(row) ? row : Object.values(row))
    : [Object.keys(first), ...rows.map((row) => Array.isArray(row) ? row : Object.values(row))];
  return normalized.map((row) => row.map(csvCell).join(',')).join('\n');
};

export const exportToCsv = (filename: string, rows: CsvRow[]): void => {
  if (typeof window === 'undefined') return;
  if (rows.length === 0) return;
  const csv = rowsToCsv(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  link.click();
  URL.revokeObjectURL(url);
};
