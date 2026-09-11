import { describe, expect, it } from 'vitest';
import { buildCustomerTrackingMilestones } from './customer-tracking.js';

describe('customer tracking projection', () => {
  it('collapses seven transit scans into one major milestone while preserving all minor scans', () => {
    const scans = Array.from({ length: 7 }, (_, index) => ({ status: 'in_transit' as const, message: `Facility update ${index + 1}`, location: 'Delhi', timestamp: new Date(2026, 7, 12, index) }));
    const result = buildCustomerTrackingMilestones({ status: 'in_transit', createdAt: new Date(2026, 7, 11), scans });
    expect(result.milestones.filter((milestone) => milestone.key === 'in_transit')).toHaveLength(1);
    expect(result.milestones.find((milestone) => milestone.key === 'in_transit')?.scans).toHaveLength(7);
    expect(result.milestones.find((milestone) => milestone.key === 'in_transit')?.scans.every((scan) => !scan.message.includes('Facility update'))).toBe(true);
    expect(result.currentMilestone).toBe('in_transit');
  });

  it.each(['ndr', 'delivery_exception', 'rto_in_transit', 'cancelled', 'lost', 'damaged'] as const)('promotes %s as an exception and stops normal transit emphasis', (status) => {
    const result = buildCustomerTrackingMilestones({ status, scans: [{ status, timestamp: new Date() }] });
    expect(result.milestones.at(-1)).toMatchObject({ key: status, current: true, exception: true });
    expect(result.milestones.find((milestone) => milestone.key === 'in_transit')?.current).toBe(false);
  });

  it('keeps the last normal milestone completed while presenting an exception separately', () => {
    const result = buildCustomerTrackingMilestones({ status: 'ndr', scans: [
      { status: 'in_transit', timestamp: new Date(2026, 7, 11) },
      { status: 'ndr', timestamp: new Date(2026, 7, 12) }
    ] });
    expect(result.milestones.find((milestone) => milestone.key === 'in_transit')).toMatchObject({ completed: true, current: false });
    expect(result.latestMessage).toContain('could not complete delivery');
  });

  it('uses reverse-logistics milestones for return shipments', () => {
    const result = buildCustomerTrackingMilestones({ type: 'return', status: 'return_in_transit', scans: [{ status: 'picked_up', timestamp: new Date() }, { status: 'return_in_transit', timestamp: new Date() }] });
    expect(result.currentMilestone).toBe('return_in_transit');
    expect(result.milestones.map((milestone) => milestone.label)).toEqual(['Return requested', 'Pickup scheduled', 'Picked up', 'Return in transit', 'Received']);
  });
});
