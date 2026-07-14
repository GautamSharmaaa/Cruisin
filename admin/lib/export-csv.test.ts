import { describe, expect, it } from 'vitest';
import { csvCell } from './export-csv';

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
