// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { parseShiprocketDate } from './shiprocket-date.js';
import { confirmedShiprocketDeliveryDate } from './shiprocket-delivery.js';

describe('Shiprocket date parsing', () => {
  it.each(['UTC', 'Asia/Kolkata', 'America/New_York'])('parses unzoned India local dates independently of host TZ %s', (timezone) => {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      expect(parseShiprocketDate('2026-09-15 15:08:00')?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
      expect(parseShiprocketDate('2026-09-15T15:08:00')?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
      expect(parseShiprocketDate('2026-09-15')?.toISOString()).toBe('2026-09-14T18:30:00.000Z');
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it.each(['2026-09-15T09:38:00Z', '2026-09-15T15:08:00+05:30', '2026-09-15T15:08:00+0530', '2026-09-15T05:38:00-04:00'])('preserves explicit offset %s', (input) => {
    expect(parseShiprocketDate(input)?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
  });

  it.each([undefined, '', '0000-00-00 00:00:00', '2026-02-30 15:08:00', '2026-09-15 24:00:00', '2026-09-15 15:60:00', 'garbage', '09/15/2026', '2026-09-15T15:08:00+25:00'])('rejects invalid or ambiguous dates %s', (input) => {
    expect(parseShiprocketDate(input)).toBeUndefined();
  });

  it('preserves milliseconds and the previous UTC day across IST midnight', () => {
    expect(parseShiprocketDate('2026-09-15 00:08:00.125')?.toISOString()).toBe('2026-09-14T18:38:00.125Z');
  });
});

describe('courier delivery confirmation', () => {
  const now = Date.parse('2026-09-15T12:00:00Z');
  it('uses the original delivered event, not a later non-delivery scan', () => {
    expect(confirmedShiprocketDeliveryDate({ status: 'delivered', rawStatus: 'Delivered', scans: [
      { status: 'delivered', rawStatus: 'Delivered', message: 'Delivered', timestamp: '2026-09-15T09:38:00Z' },
      { status: 'in_transit', rawStatus: 'In Transit', message: 'Late update', timestamp: '2026-09-15T11:00:00Z' }
    ] }, now)?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
  });
  it('prefers the provider delivery summary and never invents a delivery date', () => {
    expect(confirmedShiprocketDeliveryDate({ status: 'delivered', rawStatus: 'Delivered', deliveredDate: '2026-09-15 15:08:00', scans: [] }, now)?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
    expect(confirmedShiprocketDeliveryDate({ status: 'delivered', rawStatus: 'Delivered', scans: [] }, now)).toBeUndefined();
    expect(confirmedShiprocketDeliveryDate({ status: 'delivered', rawStatus: 'Delivered', deliveredDate: '2026-09-15T15:08:00Z', scans: [] }, now)).toBeUndefined();
    expect(confirmedShiprocketDeliveryDate({ status: 'in_transit', rawStatus: 'In Transit', deliveredDate: '2026-09-15T09:38:00Z', scans: [] }, now)).toBeUndefined();
  });
});
