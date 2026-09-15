import { expect, test } from '@playwright/test';

const storefrontUrl = 'http://localhost:3100';
const orderId = '66b000000000000000000399';
const envelope = (data: unknown): string => JSON.stringify({ success: true, data, message: 'OK' });
const baseOrder = { _id: orderId, id: orderId, orderNumber: 'CR-DELIVERY-STATE-QA', paymentStatus: 'paid', paymentMode: 'online', subtotal: 1499, shipping: 0, tax: 0, total: 1499, amountPaid: 1499, amountDue: 0, createdAt: '2026-08-13T08:00:00.000Z', shippingAddress: { fullName: 'QA Customer', phone: '+919000000000', line1: 'QA Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' }, items: [{ product: 'product-id', variant: 'variant-id', title: 'Delivery State QA Tee', sku: 'QA-DELIVERED-M', size: 'M', color: 'Black', quantity: 1, price: 1499, image: '/cruisin-image-fallback.svg' }], timeline: [{ status: 'delivered', timestamp: '2026-08-14T06:00:00.000Z', note: 'Delivered by courier' }] };

const requestHistory = { returns: [], exchanges: [{ _id: 'exchange-qa', requestNumber: 'EX-AUDIT-001', order: orderId, status: 'replacement_shipped', requestedSku: 'QA-DELIVERED-L', originalItem: { title: 'Delivery State QA Tee', sku: 'QA-DELIVERED-M', quantity: 1 }, createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-15T08:00:00Z' }] };
const liveWindow = () => ({ deliveredAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 5 * 86_400_000 - 60_000).toISOString(), eligible: true, daysRemaining: 5 });

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // API mocks registered by authenticate take precedence over this guard.
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
});

const authenticate = async (page: import('@playwright/test').Page, order: Record<string, unknown>, tracking: Record<string, unknown>): Promise<void> => {
  await page.addInitScript(() => window.localStorage.setItem('cruisin_has_session', 'true'));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'qa-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'customer-id', name: 'QA Customer', email: 'qa@example.com', role: 'customer', isVerified: true, isActive: true }) });
    if (path.endsWith(`/orders/${orderId}/tracking`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(tracking) });
    if (path.endsWith(`/orders/${orderId}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order) });
    if (path.endsWith('/fulfillment/mine')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(requestHistory) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
};

test('delivered order opens one return/exchange window and shows days remaining', async ({ page }, testInfo) => {
  const order = { ...baseOrder, orderStatus: 'delivered', fulfillmentStatus: 'fulfilled' };
  const tracking = { orderId, orderNumber: order.orderNumber, orderStatus: 'delivered', fulfillmentStatus: 'fulfilled', returnWindow: liveWindow(), shipments: [] };
  await authenticate(page, order, tracking);
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByText('5 days left to request a return or exchange')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('eligible-order.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return or exchange' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Return an item')).toBeVisible();
  await expect(dialog.getByText('Exchange size or colour')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close return dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: /Exchange size or colour/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close return dialog' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('return-exchange-dialog.png') });
  await page.getByRole('button', { name: 'Close return dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('EX-AUDIT-001')).toBeVisible();
  await expect(page.getByText('replacement shipped', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('expired courier window keeps the action disabled', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, returnWindow: { ...liveWindow(), deliveredAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), endsAt: new Date(Date.now() - 86_400_000).toISOString(), eligible: false }, shipments: [] });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Window closed' })).toBeDisabled();
});

test('refreshing a corrected courier timezone timestamp restores the return/exchange action', async ({ page }) => {
  const corrected = Date.now() - 60_000;
  const shifted = corrected + 330 * 60_000;
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, shipments: [], returnWindow: {
    deliveredAt: new Date(shifted).toISOString(), endsAt: new Date(shifted + 5 * 86_400_000).toISOString(), eligible: false, daysRemaining: 5
  } });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Delivery confirmation unavailable' })).toBeDisabled();
  await page.route(`**/api/v1/orders/${orderId}/tracking`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({
    orderId, shipments: [], returnWindow: { deliveredAt: new Date(corrected).toISOString(), endsAt: new Date(corrected + 5 * 86_400_000).toISOString(), eligible: true, daysRemaining: 5 }
  }) }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Return or exchange', exact: true })).toBeEnabled();
  await expect(page.getByText('5 days left to request a return or exchange')).toBeVisible();
  await page.getByRole('button', { name: 'Return or exchange', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Return an item')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Exchange size or colour')).toBeVisible();
});

test('order marked delivered without courier timestamp does not enable requests', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, shipments: [] });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Delivery confirmation unavailable' })).toBeDisabled();
});

test('failed tracking keeps requests disabled rather than trusting the order status', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, {});
  await page.route(`**/api/v1/orders/${orderId}/tracking`, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Tracking temporarily unavailable' }) }));
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Delivery confirmation unavailable' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Return or exchange', exact: true })).toHaveCount(0);
});

test('cancelled order cannot use stale courier eligibility', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'cancelled' }, { orderId, returnWindow: liveWindow(), shipments: [] });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Order cancelled' })).toBeDisabled();
});

test('undelivered order shows availability after delivery', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'shipped' }, { orderId, shipments: [] });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Available after delivery' })).toBeDisabled();
});

test('return dialog validates item, reason and evidence before payment', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, returnWindow: liveWindow(), shipments: [] });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await page.getByRole('button', { name: 'Return or exchange' }).click();
  await page.getByRole('button', { name: 'Return an item' }).click();
  await expect(page.getByRole('button', { name: 'Review & continue' })).toBeDisabled();
  await page.getByLabel('Return quantity for Delivery State QA Tee').selectOption('1');
  await page.getByRole('dialog').getByRole('combobox').nth(1).selectOption('wrong_size_fit');
  await expect(page.getByRole('button', { name: 'Review & continue' })).toBeDisabled();
});

test('account history includes exchanges even when there are no returns', async ({ page }) => {
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, {});
  await page.goto(`${storefrontUrl}/account/returns`);
  await expect(page.getByRole('heading', { name: 'My returns & exchanges' })).toBeVisible();
  await expect(page.getByText('EX-AUDIT-001')).toBeVisible();
  await expect(page.getByText('replacement shipped', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No return or exchange requests' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Original order' })).toHaveAttribute('href', `/account/orders/${orderId}`);
});

test('return evidence proceeds through review and reuses a paid request safely', async ({ page }) => {
  let submitted = false;
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, returnWindow: liveWindow(), shipments: [] });
  await page.route('**/api/v1/fulfillment/returns/evidence', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ publicId: 'qa-evidence', version: 1, format: 'png', token: 'qa-signed-token', url: `${storefrontUrl}/cruisin-image-fallback.svg` }) }));
  await page.route('**/api/v1/fulfillment/returns', (route) => {
    const input = route.request().postDataJSON() as { orderId: string; items: Array<{ variantId: string; quantity: number }>; reason: string; evidence: Array<{ publicId: string; token: string }>; idempotencyKey: string };
    expect(input).toMatchObject({ orderId, items: [{ variantId: 'variant-id', quantity: 1 }], reason: 'wrong_size_fit', evidence: [{ publicId: 'qa-evidence', token: 'qa-signed-token' }] });
    expect(input.idempotencyKey).toBeTruthy();
    submitted = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ request: { id: 'return-qa', requestNumber: 'RET-QA-PAID', handlingFeePaymentStatus: 'paid' }, payment: null }) });
  });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await page.getByRole('button', { name: 'Return or exchange' }).click();
  await page.getByRole('button', { name: 'Return an item' }).click();
  await page.getByLabel('Return quantity for Delivery State QA Tee').selectOption('1');
  await page.getByRole('dialog').getByRole('combobox').nth(1).selectOption('wrong_size_fit');
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles({ name: 'issue.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1kAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByRole('button', { name: 'Review & continue' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Return items' })).toHaveCount(0);
  await expect(page.getByText('Payable now', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pay ₹100 & Submit Return' }).click();
  await expect(page.getByText('RET-QA-PAID')).toBeVisible();
  expect(submitted).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('cruisin:return-attempt:')))).toEqual([]);
});

test('exchange choices load and retry reuses the same request key', async ({ page }) => {
  const keys: string[] = [];
  await authenticate(page, { ...baseOrder, orderStatus: 'delivered' }, { orderId, returnWindow: liveWindow(), shipments: [] });
  await page.route(`**/api/v1/fulfillment/exchanges/options/${orderId}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ variantId: 'variant-id', productId: 'product-id', title: 'Delivery State QA Tee', sku: 'QA-DELIVERED-M', size: 'M', color: 'Black', quantity: 1, alternatives: [{ id: 'variant-id', size: 'M', color: 'Black', stock: 10, enabled: true }, { id: 'replacement-id', size: 'L', color: 'Black', stock: 10, enabled: true }, { id: 'unavailable-id', size: 'XL', color: 'Black', stock: 0, enabled: true }] }] }) }));
  await page.route('**/api/v1/fulfillment/exchanges', (route) => {
    const input = route.request().postDataJSON() as { idempotencyKey: string; requestedVariantId: string };
    keys.push(input.idempotencyKey);
    expect(input.requestedVariantId).toBe('replacement-id');
    return route.fulfill({ status: keys.length === 1 ? 503 : 200, contentType: 'application/json', body: keys.length === 1 ? JSON.stringify({ success: false, message: 'Simulated temporary failure' }) : envelope({ request: { id: 'exchange-qa-retry', requestNumber: 'EX-QA-RETRY', handlingFeePaymentStatus: 'paid' }, payment: null }) });
  });
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await page.getByRole('button', { name: 'Return or exchange' }).click();
  await page.getByRole('button', { name: /Exchange size or colour/ }).click();
  await expect(page.getByLabel('Replacement size or colour')).toHaveValue('replacement-id');
  await expect(page.getByRole('option', { name: 'XL / Black — unavailable' })).toHaveJSProperty('disabled', true);
  await page.getByRole('button', { name: 'Pay ₹100 & request exchange' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Simulated temporary failure');
  await page.getByRole('button', { name: 'Pay ₹100 & request exchange' }).click();
  await expect(page.getByText('EX-QA-RETRY')).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('cruisin:exchange-attempt:')))).toEqual([]);
});

test('cancelled tracking replaces transit with a red cancellation state', async ({ page }) => {
  const order = { ...baseOrder, orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', cancellation: { requestedBy: 'admin', reasonCode: 'admin_cancelled', reason: 'Cancelled by Cruisin', requestedAt: '2026-08-14T07:00:00.000Z', cancelledAt: '2026-08-14T07:00:00.000Z', refundStatus: 'required', refundAmount: 0 } };
  const exception = { key: 'cancelled', label: 'Shipment cancelled', message: 'This shipment was cancelled.', reachedAt: '2026-08-14T07:00:00.000Z', current: true, completed: true, exception: true, scans: [] };
  const tracking = { orderId, orderNumber: order.orderNumber, orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', shipments: [{ id: 'shipment-id', type: 'forward', status: 'cancelled', latestMessage: 'This shipment was cancelled.', currentMilestone: 'cancelled', milestones: [{ key: 'confirmed', label: 'Order confirmed', message: 'Confirmed', current: false, completed: true, exception: false, scans: [] }, { key: 'preparing', label: 'Preparing', message: 'Preparing', current: false, completed: true, exception: false, scans: [] }, { key: 'shipped', label: 'Shipped', message: 'Shipped', current: false, completed: true, exception: false, scans: [] }, { key: 'in_transit', label: 'In transit', message: 'In transit', current: false, completed: true, exception: false, scans: [] }, { key: 'out_for_delivery', label: 'Out for delivery', message: 'Out for delivery', current: false, completed: false, exception: false, scans: [] }, { key: 'delivered', label: 'Delivered', message: 'Delivered', current: false, completed: false, exception: false, scans: [] }, exception], scans: [] }] };
  await authenticate(page, order, tracking);
  await page.goto(`${storefrontUrl}/account/orders/${orderId}/tracking`);
  await expect(page.getByRole('heading', { name: 'This shipment was cancelled.' })).toHaveClass(/text-danger/);
  await expect(page.getByText('Shipment cancelled', { exact: true })).toBeVisible();
});
