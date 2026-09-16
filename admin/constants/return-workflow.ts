// Governed by .rules v1.0

export const RETURN_WORKFLOW_ACTIONS: Record<string, readonly string[]> = {
  requested: ['approved', 'rejected', 'more_information'],
  more_information: ['approved', 'rejected'],
  approved: ['create_reverse_pickup'],
  reverse_pickup: ['warehouse_received'],
  in_transit: ['warehouse_received'],
  warehouse_received: ['quality_check_passed', 'quality_check_failed'],
  quality_check_passed: ['open_refund_window'],
  quality_check_failed: ['closed'],
  refund_window_open: ['refund_pending'],
  refund_pending: ['refunded'],
  refunded: ['closed'],
  rejected: ['closed']
};

const ADMIN_ONLY_ACTIONS = new Set(['create_reverse_pickup', 'open_refund_window', 'refund_pending', 'refunded']);
const DEDICATED_UI_ACTIONS = new Set(['record_manual_upi_refund']);

export const visibleReturnWorkflowActions = (status: string, role: string | undefined, serverActions?: string[]): string[] => {
  const actions = serverActions ?? [...(RETURN_WORKFLOW_ACTIONS[status] ?? [])];
  const canPerformAdminAction = role === 'admin' || role === 'superadmin';
  return actions.filter((action) => !DEDICATED_UI_ACTIONS.has(action) && (!ADMIN_ONLY_ACTIONS.has(action) || canPerformAdminAction));
};

export const returnWorkflowWaitingMessage = (status: string, role: string | undefined, serverActions?: string[]): string | undefined => {
  const actions = serverActions ?? [...(RETURN_WORKFLOW_ACTIONS[status] ?? [])];
  if (!actions.length || visibleReturnWorkflowActions(status, role, serverActions).length) return undefined;
  if (actions.includes('create_reverse_pickup')) return 'Approved. Waiting for an admin or superadmin to create the reverse pickup.';
  return 'Waiting for an admin or superadmin to continue the refund workflow.';
};

export const returnWorkflowActionLabel = (action: string): string => {
  if (action === 'approved') return 'Approve';
  if (action === 'rejected') return 'Reject';
  if (action === 'more_information') return 'More information';
  if (action === 'create_reverse_pickup') return 'Create reverse pickup';
  if (action === 'warehouse_received') return 'Mark warehouse received';
  if (action === 'quality_check_passed') return 'Quality check passed';
  if (action === 'quality_check_failed') return 'Quality check failed';
  if (action === 'open_refund_window') return 'Open refund window';
  if (action === 'refund_pending') return 'Initiate verified refund';
  if (action === 'refunded') return 'Confirm provider refund';
  if (action === 'closed') return 'Close request';
  return action.replaceAll('_', ' ');
};
