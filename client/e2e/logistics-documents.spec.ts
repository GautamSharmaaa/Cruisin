import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const shipmentId = '66a000000000000000000101';
const orderId = '66a000000000000000000102';
const envelope = (data: unknown, message = 'OK'): string => JSON.stringify({ success: true, data, message });
const admin = { id: 'admin-id', _id: 'admin-id', name: 'Logistics Admin', email: 'admin@example.test', role: 'superadmin', isVerified: true, isActive: true };
const shipment = {
  _id: shipmentId,
  sourceOrderId: 'CR-SHIP-QA',
  order: { _id: orderId, orderNumber: 'CR-SHIP-QA', shippingAddress: { fullName: 'Ship QA', postalCode: '560001' }, total: 2200 },
  shipmentType: 'forward',
  shipmentStatus: 'pickup_scheduled',
  pickupStatus: 'Pickup Scheduled',
  providerOrderId: 'MOCK-ORDER-SHIP',
  providerShipmentId: 'MOCK-SHIPMENT-SHIP',
  courierName: 'Mock Surface',
  awb: 'MOCKAWBSHIP001',
  estimatedDelivery: '2026-08-14T00:00:00.000Z',
  lastSuccessfulSyncAt: '2026-08-11T10:00:00.000Z',
  lastSyncSource: 'webhook',
  trackingScans: [{ fingerprint: 'scan-1', status: 'pickup_scheduled', rawStatus: 'Pickup Scheduled', message: 'Pickup scheduled', location: 'Bengaluru', timestamp: '2026-08-11T09:30:00.000Z' }],
  package: { deadWeightKg: 0.8, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
  updatedAt: '2026-08-11T10:00:00.000Z'
};

const loginAndOpenLogistics = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill('admin@example.test');
  await page.getByLabel('Password').fill('TestOnlyPassword1');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
  await page.getByRole('link', { name: 'Logistics', exact: true }).click();
  await expect(page.getByText('CR-SHIP-QA')).toBeVisible();
};

test('admin ships in Shiprocket and uses read-only Sync now without primary AWB controls', async ({ page }) => {
  const posts: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-logistics-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 1, ready: 1, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 92, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/sync-health')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ activeShipments: 1, lastWebhookAt: '2026-08-11T10:00:00.000Z', lastReconciliationAt: '2026-08-11T09:55:00.000Z', syncFailures: 0 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    if (path.endsWith(`/${shipmentId}/sync`) && request.method() === 'POST') {
      posts.push(path);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ shipment, changed: false, statusChanged: false, scansAdded: 0 }) });
    }
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await loginAndOpenLogistics(page);
  await expect(page.getByRole('button', { name: 'Assign AWB' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Select courier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Generate label/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ship', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ship this order' })).toBeVisible();
  await expect(page.getByText('Complete courier selection, AWB, label, manifest and pickup from the Shiprocket dashboard.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Shiprocket' })).toHaveAttribute('href', 'https://app.shiprocket.in/');
  await page.getByRole('button', { name: 'Sync now', exact: true }).last().click();
  await expect(page.getByRole('status').filter({ hasText: 'Synced just now' })).toBeVisible();
  expect(posts).toEqual([`/api/v1/admin/logistics/${shipmentId}/sync`]);
});

test('manual synchronization failure is visible and retryable', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 1, ready: 1, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 0, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/sync-health')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ activeShipments: 1, syncFailures: 1 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    if (path.endsWith(`/${shipmentId}/sync`) && request.method() === 'POST') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Shiprocket synchronization is temporarily unavailable' }) });
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await loginAndOpenLogistics(page);
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Sync failed — Retry' })).toContainText('Sync failed — Retry');
  await expect(page.getByRole('button', { name: 'Sync now', exact: true })).toBeEnabled();
});
