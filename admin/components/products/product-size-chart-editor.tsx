'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { readSizeChart, writeSizeChart } from '@cruisin/contracts/product-size-chart';
import { Button } from '@/components/ui/button';

interface ProductSizeChartEditorProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const initialChart = { columns: ['Size', 'Measurement'], rows: [['', '']] };
const cellClass = 'w-full min-w-24 border border-border bg-background-primary px-2 py-2 text-sm text-text-primary';

export function ProductSizeChartEditor({ value, error, onChange }: ProductSizeChartEditorProps) {
  const [useLegacyInput, setUseLegacyInput] = useState(false);
  const parsed = readSizeChart(value);
  const chart = parsed ?? initialChart;
  const { columns, rows } = chart;
  function update(nextColumns: string[], nextRows: string[][]) {
    onChange(writeSizeChart({ columns: nextColumns, rows: nextRows }));
  }

  return <div className="grid min-w-0 gap-3">
    {!parsed && (value.trim() || useLegacyInput) ? <div className="grid gap-2">
      <label className="grid gap-2 text-sm">Chart link or fit notes
        <textarea rows={4} maxLength={2000} className={cellClass} value={value} onChange={event => onChange(event.target.value)} />
      </label>
      <Button type="button" variant="secondary" className="justify-self-start" onClick={() => { setUseLegacyInput(false); update(columns, rows); }}>
        Use a table
      </Button>
    </div> : <>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Editable product size chart</caption>
          <thead><tr className="bg-background-overlay">
            {columns.map((heading, column) => <th key={column} scope="col" className="border-b border-border p-2">
              <div className="flex items-center gap-1">
                <input aria-label={'Column ' + (column + 1) + ' heading'} className={cellClass} value={heading}
                  onChange={event => update(columns.map((cell, index) => index === column ? event.target.value : cell), rows)} />
                <button type="button" className="grid h-9 w-9 shrink-0 place-items-center text-text-secondary disabled:opacity-35" disabled={columns.length <= 1}
                  aria-label={'Remove column ' + (column + 1)} onClick={() => update(columns.filter((_, index) => index !== column), rows.map(row => row.filter((_, index) => index !== column)))}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </th>)}
            <th scope="col" className="border-b border-border p-2"><span className="sr-only">Row actions</span></th>
          </tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>
            {row.map((cell, column) => <td key={column} className="border-b border-border p-2">
              <input aria-label={'Row ' + (rowIndex + 1) + ', column ' + (column + 1)} className={cellClass} value={cell}
                onChange={event => update(columns, rows.map((item, index) => index === rowIndex
                  ? item.map((current, cellIndex) => cellIndex === column ? event.target.value : current)
                  : item))} />
            </td>)}
            <td className="border-b border-border p-2"><button type="button" className="grid h-9 w-9 place-items-center text-text-secondary"
              aria-label={'Remove row ' + (rowIndex + 1)} onClick={() => update(columns, rows.filter((_, index) => index !== rowIndex))}>
              <Trash2 size={15} aria-hidden="true" />
            </button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => update(columns, [...rows, columns.map(() => '')])}><Plus size={16} />Add row</Button>
        <Button type="button" variant="secondary" onClick={() => update([...columns, ''], rows.map(row => [...row, '']))}><Plus size={16} />Add column</Button>
      </div>
      {!value && <Button type="button" variant="ghost" className="justify-self-start" onClick={() => setUseLegacyInput(true)}>Use chart link or fit notes</Button>}
    </>}
    {value && <Button type="button" variant="ghost" className="justify-self-start" onClick={() => { setUseLegacyInput(false); onChange(''); }}>Clear guide</Button>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
