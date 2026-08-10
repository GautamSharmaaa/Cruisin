import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const shipmentId = '66a000000000000000000101';
const orderId = '66a000000000000000000102';
const envelope = (data: unknown, message = 'OK'): string => JSON.stringify({ success: true, data, message });

test('admin generates label, invoice, manifest and opens the secure Print Label flow', async ({ page }) => {
  const admin = { id: 'admin-id', _id: 'admin-id', name: 'Logistics Admin', email: 'admin@example.test', role: 'superadmin', isVerified: true, isActive: true };
  const generated: string[] = [];
  const shipment = {
    _id: shipmentId,
    sourceOrderId: 'CR-DOC-QA',
    order: { _id: orderId, orderNumber: 'CR-DOC-QA', shippingAddress: { fullName: 'Document QA', postalCode: '560001' }, total: 2200 },
    shipmentType: 'forward',
    shipmentStatus: 'pickup_scheduled',
    providerOrderId: 'MOCK-ORDER-DOC',
    providerShipmentId: 'MOCK-SHIPMENT-DOC',
    courierName: 'Mock Surface',
    awb: 'MOCKAWBDOC001',
    package: { deadWeightKg: 0.8, lengthCm: 20, breadthCm: 15, heightCm: 5, measurementConfirmed: true, warnings: [] },
    updatedAt: '2026-07-28T00:00:00.000Z'
  };
  let generatedDocuments: Record<string, unknown> = {};

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-logistics-document-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 1, ready: 1, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 92, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    const documentAccess = path.match(new RegExp(`/admin/logistics/${shipmentId}/documents/(label|invoice|manifest)$`));
    if (documentAccess) {
      const kind = documentAccess[1] as string;
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ shipmentId, kind, status: 'ready', url: `mock://documents/${kind}/CR-DOC-QA`, generatedAt: '2026-07-28T00:00:00.000Z', expiresAt: '2026-07-28T23:59:00.000Z' }) });
    }
    const generation = path.match(new RegExp(`/admin/logistics/${shipmentId}/(label|invoice|manifest)$`));
    if (generation && request.method() === 'POST') {
      const kind = generation[1] as string;
      generated.push(kind);
      await new Promise((resolve) => setTimeout(resolve, 75));
      const document = { status: 'ready', url: `mock://documents/${kind}/CR-DOC-QA`, generatedAt: '2026-07-28T00:00:00.000Z', expiresAt: '2026-07-28T23:59:00.000Z' };
      generatedDocuments = { ...generatedDocuments, [kind]: document };
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ ...shipment, ...generatedDocuments }) });
    }
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ ...shipment, ...generatedDocuments }], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill('admin@example.test');
  await page.getByLabel('Password').fill('TestOnlyPassword1');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
  await page.getByRole('link', { name: 'Logistics', exact: true }).click();
  await expect(page.getByText('CR-DOC-QA')).toBeVisible();

  await page.getByRole('button', { name: 'Generate label', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate invoice', exact: true })).toBeDisabled();
  await expect(page.getByText(/Label ready until/)).toBeVisible();
  await page.getByRole('button', { name: 'Generate invoice', exact: true }).click();
  await expect(page.getByText(/Invoice ready until/)).toBeVisible();
  await page.getByRole('button', { name: 'Generate manifest', exact: true }).click();
  await expect(page.getByText(/Manifest ready until/)).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print Label' }).click();
  const popup = await popupPromise;
  await expect(popup.getByText('Cruisin Label')).toBeVisible();
  await expect(popup.getByText('Mock document reference: mock://documents/label/CR-DOC-QA')).toBeVisible();
  expect(generated).toEqual(['label', 'invoice', 'manifest', 'label']);
});

test('document generation failure is visible and does not show a false success state', async ({ page }) => {
  const admin = { id: 'admin-id', _id: 'admin-id', name: 'Logistics Admin', email: 'admin@example.test', role: 'superadmin', isVerified: true, isActive: true };
  const shipment = {
    _id: shipmentId,
    sourceOrderId: 'CR-DOC-FAIL',
    order: { _id: orderId, shippingAddress: { fullName: 'Document QA' } },
    shipmentType: 'forward',
    shipmentStatus: 'awb_assigned',
    providerShipmentId: 'MOCK-SHIPMENT-DOC',
    awb: 'MOCKAWBFAIL001',
    updatedAt: '2026-07-28T00:00:00.000Z'
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/logistics/kpis')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ total: 1, ready: 1, inTransit: 0, delivered: 0, ndr: 0, rto: 0, errors: 0, logisticsCost: 0, deliveryRate: 0, ndrRate: 0, rtoRate: 0 }) });
    if (path.endsWith('/admin/logistics/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [], total: 0, page: 1, pages: 0, limit: 10 }) });
    if (path.endsWith(`/${shipmentId}/label`) && route.request().method() === 'POST') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'label generation is already in progress' }) });
    if (path.endsWith('/admin/logistics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [shipment], total: 1, page: 1, pages: 1, limit: 50 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill('admin@example.test');
  await page.getByLabel('Password').fill('TestOnlyPassword1');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
  await page.getByRole('link', { name: 'Logistics', exact: true }).click();
  await page.getByRole('button', { name: 'Generate label', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'label generation is already in progress' })).toContainText('label generation is already in progress');
  await expect(page.getByText(/Label ready until/)).toHaveCount(0);
});
