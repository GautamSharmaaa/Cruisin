import { describe, expect, it } from 'vitest';
import { returnEligibility } from './return-eligibility';

const now = Date.parse('2026-09-15T12:00:00Z');
const order = { orderStatus: 'delivered' };
const returnWindow = { deliveredAt: '2026-09-14T12:00:00Z', endsAt: '2026-09-19T12:00:00Z', eligible: true, daysRemaining: 4 };

describe('courier-confirmed return eligibility', () => {
  it('enables delivered orders only within the confirmed window', () => {
    expect(returnEligibility({ order, returnWindow, now })).toBe('eligible');
  });
  it('uses courier confirmation even when the order projection is stale', () => {
    expect(returnEligibility({ order: { orderStatus: 'shipped' }, returnWindow, now })).toBe('eligible');
  });
  it('fails closed while tracking loads, fails, or has no delivery timestamp', () => {
    expect(returnEligibility({ order, returnWindow, now, trackingPending: true })).toBe('checking');
    expect(returnEligibility({ order, returnWindow, now, trackingError: true })).toBe('unavailable');
    expect(returnEligibility({ order, now })).toBe('unavailable');
  });
  it('keeps undelivered orders disabled', () => {
    expect(returnEligibility({ order: { orderStatus: 'shipped' }, now })).toBe('before_delivery');
  });
  it('never enables cancelled orders even with stale eligible tracking', () => {
    expect(returnEligibility({ order: { orderStatus: 'cancelled' }, returnWindow, now })).toBe('cancelled');
  });
  it('rejects expired and exact-boundary windows even when eligible is stale', () => {
    expect(returnEligibility({ order, returnWindow, now: Date.parse(returnWindow.endsAt) })).toBe('expired');
    expect(returnEligibility({ order, returnWindow, now: Date.parse(returnWindow.endsAt) + 1 })).toBe('expired');
  });
  it('rejects invalid and future delivery dates', () => {
    expect(returnEligibility({ order, returnWindow: { ...returnWindow, endsAt: 'invalid' }, now })).toBe('unavailable');
    expect(returnEligibility({ order, returnWindow: { ...returnWindow, deliveredAt: '2026-09-16T12:00:00Z' }, now })).toBe('unavailable');
  });
  it('does not turn a courier-ineligible window into an eligible one', () => {
    expect(returnEligibility({ order, returnWindow: { ...returnWindow, eligible: false }, now })).toBe('unavailable');
  });
});
