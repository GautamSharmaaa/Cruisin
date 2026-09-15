// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { planShiprocketTimestampRepair } from './shiprocket-timestamp-repair.js';
import type { TrackingResult } from '../../types/logistics.types.js';

describe('evidence-based Shiprocket timestamp repair', () => {
  const now = Date.parse('2026-09-15T12:00:00Z');
  const tracking: TrackingResult = {
    status: 'delivered', rawStatus: 'Delivered', deliveredDate: '2026-09-15T09:38:00Z',
    scans: [{ status: 'delivered', rawStatus: '000-T-DL', message: 'Delivered', location: 'Test hub', timestamp: '2026-09-15T09:38:00Z' }]
  };
  const legacy = {
    deliveredDate: new Date('2026-09-15T15:08:00Z'), lastTrackingUpdate: new Date('2026-09-15T15:08:00Z'),
    trackingScans: [{ ...tracking.scans[0], timestamp: new Date('2026-09-15T15:08:00Z'), fingerprint: 'legacy-fingerprint' }]
  };

  it('corrects only the exact shift supported by matching courier events', () => {
    const repair = planShiprocketTimestampRepair(legacy, tracking, now);
    expect(repair?.deliveredDate.toISOString()).toBe('2026-09-15T09:38:00.000Z');
    expect(repair?.lastTrackingUpdate?.toISOString()).toBe('2026-09-15T09:38:00.000Z');
    expect(repair?.scansCorrected).toBe(1);
    expect(repair?.trackingScans[0].fingerprint).not.toBe('legacy-fingerprint');
    expect(legacy.deliveredDate.toISOString()).toBe('2026-09-15T15:08:00.000Z');
    expect(repair && planShiprocketTimestampRepair(repair, tracking, now)).toBeUndefined();
  });

  it('does not rewrite ambiguous dates or accept future/unconfirmed deliveries', () => {
    expect(planShiprocketTimestampRepair({ ...legacy, deliveredDate: new Date('2026-09-14T15:08:00Z') }, tracking, now)).toBeUndefined();
    expect(planShiprocketTimestampRepair(legacy, { ...tracking, status: 'in_transit' }, now)).toBeUndefined();
    expect(planShiprocketTimestampRepair(legacy, { ...tracking, deliveredDate: '2026-09-16T09:38:00Z', scans: [] }, now)).toBeUndefined();
  });

  it('requires matching raw status, message, and location to alter a scan', () => {
    const repair = planShiprocketTimestampRepair(legacy, { ...tracking, scans: [{ ...tracking.scans[0], location: 'Different hub' }] }, now);
    expect(repair?.scansCorrected).toBe(0);
    expect(repair?.trackingScans[0].timestamp.toISOString()).toBe('2026-09-15T15:08:00.000Z');
  });

  it('repairs old delivery dates without resetting their expired return windows to today', () => {
    const oldTracking = { ...tracking, deliveredDate: '2026-09-01T09:38:00Z', scans: [] };
    const repair = planShiprocketTimestampRepair({ trackingScans: [], deliveredDate: new Date('2026-09-01T15:08:00Z') }, oldTracking, now);
    expect(repair?.deliveredDate.toISOString()).toBe('2026-09-01T09:38:00.000Z');
    expect((repair?.deliveredDate.getTime() ?? now) + 5 * 86_400_000).toBeLessThan(now);
  });
});
