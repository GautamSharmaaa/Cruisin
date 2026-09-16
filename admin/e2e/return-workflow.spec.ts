import { expect, test, type Page } from '@playwright/test';

const adminUrl = 'http://localhost:3101';
const envelope = (data: unknown): string => JSON.stringify({ success: true, data, message: 'OK' });
const actionsByStatus: Record<string, string[]> = {
  requested: ['more_information', 'approved', 'rejected'], more_information: ['approved', 'rejected'],
  approved: ['create_reverse_pickup'], reverse_pickup: ['warehouse_received'], in_transit: ['warehouse_received'],
  warehouse_received: ['quality_check_passed', 'quality_check_failed'], quality_check_passed: ['open_refund_window'],
  quality_check_failed: ['closed'], refund_window_open: ['refund_pending'], refund_pending: ['refunded'],
  refunded: ['closed'], rejected: ['closed']
};
const statusForAction: Record<string, string> = {
  more_information: 'more_information', approved: 'approved', rejected: 'rejected', create_reverse_pickup: 'reverse_pickup',
  warehouse_received: 'warehouse_received', quality_check_passed: 'quality_check_passed', quality_check_failed: 'quality_check_failed',
  open_refund_window: 'refund_window_open', refund_pending: 'refund_pending', refunded: 'refunded', closed: 'closed'
};

const mockAdmin = async (page: Page, initialStatus: string, role = 'superadmin'): Promise<{ writes: string[] }> => {
  let status = initialStatus;
  const writes: string[] = [];
  await page.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'admin-return-qa-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'admin-qa', name: 'QA Admin', email: 'admin@example.test', role, isVerified: true, isActive: true }) });
    if (path.endsWith('/admin/returns') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([{ _id: 'return-qa', requestNumber: 'RET-QA-FLOW', status, allowedActions: actionsByStatus[status] ?? [], reason: 'quality_issue', refundStatus: 'not_started', createdAt: new Date().toISOString(), order: { orderNumber: 'CR-QA-RETURN' }, customer: { name: 'QA Customer' }, items: [{ sku: 'QA-TEE-M', title: 'QA Tee', size: 'M', color: 'Black', quantity: 1 }] }]) });
    if (path.endsWith('/admin/returns/return-qa/action') && request.method() === 'POST') {
      const input = request.postDataJSON() as { action: string };
      writes.push(input.action);
      status = statusForAction[input.action] ?? status;
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ _id: 'return-qa', status }) });
    }
    if (path.endsWith('/products/admin/catalogue') || path.endsWith('/admin/users')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 1 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  return { writes };
};

test('More information remains actionable through approval and reverse pickup', async ({ page }) => {
  const audit = await mockAdmin(page, 'requested');
  await page.goto(`${adminUrl}/returns`);
  await page.getByRole('button', { name: 'More information' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('button', { name: 'Create reverse pickup' })).toBeVisible();
  await page.getByRole('button', { name: 'Create reverse pickup' }).click();
  await expect(page.getByRole('button', { name: 'Mark warehouse received' })).toBeVisible();
  expect(audit.writes).toEqual(['more_information', 'approved', 'create_reverse_pickup']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('rejected and failed-quality requests retain their close action', async ({ page }) => {
  const audit = await mockAdmin(page, 'requested');
  await page.goto(`${adminUrl}/returns`);
  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByRole('button', { name: 'Close request' })).toBeVisible();
  expect(audit.writes).toEqual(['rejected']);
});

test('in-transit returns retain warehouse receipt and managers see permission handoff', async ({ page }) => {
  await mockAdmin(page, 'in_transit');
  await page.goto(`${adminUrl}/returns`);
  await expect(page.getByRole('button', { name: 'Mark warehouse received' })).toBeVisible();
});

test('approved manager request explains the admin handoff instead of showing an empty action area', async ({ page }) => {
  await mockAdmin(page, 'approved', 'manager');
  await page.goto(`${adminUrl}/returns`);
  await expect(page.getByText('Approved. Waiting for an admin or superadmin to create the reverse pickup.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create reverse pickup' })).toHaveCount(0);
});
