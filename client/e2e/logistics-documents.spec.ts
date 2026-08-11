import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const shipmentId = '66a000000000000000000101';
const unassignedShipmentId = '66a000000000000000000103';
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
  pickupDate: '2026-08-11T08:00:00.000Z',
  estimatedDelivery: '2026-08-14T00:00:00.000Z',
  lastSuccessfulSyncAt: '2026-08-11T10:00:00.000Z',
  lastSyncSource: 'webhook',
  trackingScans: [{ fingerprint: 'scan-1', status: 'pickup_scheduled', rawStatus: 'Pickup Scheduled', message: 'Pickup scheduled', location: 'Bengaluru', timestamp: '2026-08-11T09:30:00.000Z' }],
  package: { deadWeightKg: 0.8, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
  updatedAt: '2026-08-11T10:00:00.000Z'
};
const unassignedShipment = {
  ...shipment,
  _id: unassignedShipmentId,
  sourceOrderId: 'CR-AWB-QA',
  shipmentStatus: 'provider_order_created',
  pickupStatus: undefined,
  pickupDate: undefined,
  courierName: undefined,
  awb: undefined,
  trackingScans: [],
  order: { ...shipment.order, _id: '66a000000000000000000104', orderNumber: 'CR-AWB-QA' }
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

test('admin controls Shiprocket mutations, prints documents and runs top-level provider sync', async ({ page }) => {
  const posts: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-logistics-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 2, ready: 2, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 92, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/sync-health')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ activeShipments: 2, lastWebhookAt: '2026-08-11T10:00:00.000Z', lastReconciliationAt: '2026-08-11T09:55:00.000Z', syncFailures: 0 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    if (path.endsWith('/admin/logistics/sync') && request.method() === 'POST') {
      posts.push(path);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ scanned: 2, changed: 1, unchanged: 1, failed: 0, shiprocketMutations: 0 }) });
    }
    if (path.endsWith(`/${shipmentId}/label`) && request.method() === 'POST') {
      posts.push(path);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(shipment) });
    }
    if (path.endsWith(`/${shipmentId}/documents/label`) && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ shipmentId, kind: 'label', status: 'ready', url: `mock://logistics/label/${shipmentId}.pdf`, generatedAt: '2026-08-11T10:01:00.000Z', expiresAt: '2026-08-11T11:01:00.000Z' }) });
    if (path.endsWith(`/${unassignedShipmentId}/compare-couriers`) && request.method() === 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ serviceable: true, couriers: [{ courierId: 10, courierName: 'Mock Surface', shippingMode: 'surface', freightCharge: 92, codCharge: 0, totalCharge: 92, estimatedDeliveryDays: 3, codAvailable: true, serviceable: true, rating: 4.7 }] }) });
    if (path.endsWith(`/${unassignedShipmentId}/assign-awb`) && request.method() === 'POST') {
      posts.push(path);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ ...unassignedShipment, awb: 'MOCKAWBASSIGNED', courierName: 'Mock Surface', shipmentStatus: 'awb_assigned' }) });
    }
    if (path.endsWith(`/${shipmentId}/sync`) && request.method() === 'POST') {
      posts.push(path);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ shipment, changed: false, statusChanged: false, scansAdded: 0 }) });
    }
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment, unassignedShipment], total: 2, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await loginAndOpenLogistics(page);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Select courier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Print label' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print invoice' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate manifest' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel shipment' })).toBeVisible();
  const labelPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print label' }).first().click();
  const labelPopup = await labelPopupPromise;
  await expect(labelPopup.getByText(`Mock document reference: mock://logistics/label/${shipmentId}.pdf`)).toBeVisible();
  await page.getByRole('button', { name: 'Sync with Shiprocket' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Shiprocket sync complete' })).toContainText('1 changed');
  await page.getByRole('button', { name: 'Assign AWB' }).click();
  await expect(page.getByRole('heading', { name: 'Assign AWB for CR-AWB-QA' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm & assign AWB' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'AWB assigned by Shiprocket' })).toBeVisible();
  await page.getByRole('button', { name: 'Ship', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Ship this order' })).toBeVisible();
  await expect(page.getByText(/admin-only AWB, pickup, document and cancellation controls/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Shiprocket' })).toHaveAttribute('href', 'https://app.shiprocket.in/');
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Synced just now' })).toBeVisible();
  expect(posts).toEqual([`/api/v1/admin/logistics/${shipmentId}/label`, '/api/v1/admin/logistics/sync', `/api/v1/admin/logistics/${unassignedShipmentId}/assign-awb`, `/api/v1/admin/logistics/${shipmentId}/sync`]);
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
    if (path.endsWith('/admin/logistics/sync') && request.method() === 'POST') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Shiprocket synchronization is temporarily unavailable' }) });
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await loginAndOpenLogistics(page);
  await page.getByRole('button', { name: 'Sync with Shiprocket' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Shiprocket sync failed — Retry' })).toContainText('Shiprocket sync failed — Retry');
  await expect(page.getByRole('button', { name: 'Sync with Shiprocket' })).toBeEnabled();
});

test('manager can synchronize provider truth but cannot see Shiprocket mutation controls', async ({ page }) => {
  const manager = { ...admin, id: 'manager-id', _id: 'manager-id', email: 'manager@example.test', role: 'manager' };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: manager, accessToken: 'manager-logistics-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(manager) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 1, ready: 1, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 92, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/sync-health')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ activeShipments: 1, syncFailures: 0 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await loginAndOpenLogistics(page);
  await expect(page.getByRole('button', { name: 'Sync with Shiprocket' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Print label' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Print invoice' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Generate manifest' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cancel shipment' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ship', exact: true })).toHaveCount(0);
});
