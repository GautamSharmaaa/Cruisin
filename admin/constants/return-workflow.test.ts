// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { RETURN_WORKFLOW_ACTIONS, returnWorkflowActionLabel, returnWorkflowWaitingMessage, visibleReturnWorkflowActions } from './return-workflow';

describe('admin return workflow actions', () => {
  it.each([
    ['requested', ['approved', 'rejected', 'more_information']],
    ['more_information', ['approved', 'rejected']],
    ['approved', ['create_reverse_pickup']],
    ['reverse_pickup', ['warehouse_received']],
    ['in_transit', ['warehouse_received']],
    ['warehouse_received', ['quality_check_passed', 'quality_check_failed']],
    ['quality_check_passed', ['open_refund_window']],
    ['quality_check_failed', ['closed']],
    ['refund_window_open', ['refund_pending']],
    ['refund_pending', ['refunded']],
    ['refunded', ['closed']],
    ['rejected', ['closed']]
  ])('keeps %s connected to its next action', (status, expected) => {
    expect(RETURN_WORKFLOW_ACTIONS[status]).toEqual(expected);
  });

  it('uses server-provided actions and filters only privileged operations', () => {
    expect(visibleReturnWorkflowActions('more_information', 'manager', ['approved', 'rejected'])).toEqual(['approved', 'rejected']);
    expect(visibleReturnWorkflowActions('approved', 'manager', ['create_reverse_pickup'])).toEqual([]);
    expect(visibleReturnWorkflowActions('approved', 'superadmin', ['create_reverse_pickup'])).toEqual(['create_reverse_pickup']);
    expect(visibleReturnWorkflowActions('refund_window_open', 'superadmin', ['refund_pending', 'record_manual_upi_refund'])).toEqual(['refund_pending']);
    expect(returnWorkflowWaitingMessage('approved', 'manager', ['create_reverse_pickup'])).toContain('Waiting for an admin');
  });

  it('shows readable labels and no phantom action for terminal states', () => {
    expect(returnWorkflowActionLabel('more_information')).toBe('More information');
    expect(returnWorkflowActionLabel('quality_check_failed')).toBe('Quality check failed');
    expect(visibleReturnWorkflowActions('closed', 'superadmin')).toEqual([]);
    expect(returnWorkflowWaitingMessage('closed', 'superadmin')).toBeUndefined();
  });
});
