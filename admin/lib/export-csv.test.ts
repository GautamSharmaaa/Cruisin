import { describe, expect, it } from 'vitest';
import { csvCell, rowsToCsv } from './export-csv';

describe('csvCell', () => {
  it.each(['=1+1', '+SUM(A1:A2)', '-cmd', '@payload', '\tformula', '\rformula', '   =formula'])('neutralizes formula-capable text %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
  });

  it('keeps intentionally numeric negative values numeric', () => {
    expect(csvCell(-42)).toBe('"-42"');
  });

  it('escapes commas, quotes, and newlines as one valid quoted cell', () => {
    expect(csvCell('Cruisin, "QA"\nline two')).toBe('"Cruisin, ""QA""\nline two"');
  });

  it('does not alter ordinary text', () => {
    expect(csvCell('Signal Cargo')).toBe('"Signal Cargo"');
  });
});

describe('rowsToCsv', () => {
  it('creates an understandable filtered profitability export with headers', () => {
    const csv = rowsToCsv([{ Order: 'CR-100', SKU: 'TEE-M', 'COD state': 'pending', 'Return fee': 100, 'Net profit': 499 }]);
    expect(csv).toContain('"Order","SKU","COD state","Return fee","Net profit"');
    expect(csv).toContain('"CR-100","TEE-M","pending","100","499"');
  });
});
