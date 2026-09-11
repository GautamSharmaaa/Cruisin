import { expect, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3100';
const orderId = '66b000000000000000000399';
const envelope = (data: unknown): string => JSON.stringify({ success: true, data, message: 'OK' });
const baseOrder = { _id: orderId, id: orderId, orderNumber: 'CR-DELIVERY-STATE-QA', paymentStatus: 'paid', paymentMode: 'online', subtotal: 1499, shipping: 0, tax: 0, total: 1499, amountPaid: 1499, amountDue: 0, createdAt: '2026-08-13T08:00:00.000Z', shippingAddress: { fullName: 'QA Customer', phone: '+919000000000', line1: 'QA Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' }, items: [{ product: 'product-id', variant: 'variant-id', title: 'Delivery State QA Tee', sku: 'QA-DELIVERED-M', size: 'M', color: 'Black', quantity: 1, price: 1499, image: '/cruisin-image-fallback.svg' }], timeline: [{ status: 'delivered', timestamp: '2026-08-14T06:00:00.000Z', note: 'Delivered by courier' }] };

const authenticate = async (page: import('@playwright/test').Page, order: Record<string, unknown>, tracking: Record<string, unknown>): Promise<void> => {
  await page.addInitScript(() => window.localStorage.setItem('cruisin_has_session', 'true'));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'qa-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'customer-id', name: 'QA Customer', email: 'qa@example.com', role: 'customer', isVerified: true, isActive: true }) });
    if (path.endsWith(`/orders/${orderId}/tracking`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(tracking) });
    if (path.endsWith(`/orders/${orderId}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });
};

test('delivered order opens one return/exchange window and shows days remaining', async ({ page }) => {
  const order = { ...baseOrder, orderStatus: 'delivered', fulfillmentStatus: 'fulfilled' };
  const tracking = { orderId, orderNumber: order.orderNumber, orderStatus: 'delivered', fulfillmentStatus: 'fulfilled', returnWindow: { deliveredAt: '2026-08-14T06:00:00.000Z', endsAt: '2026-08-19T06:00:00.000Z', eligible: true, daysRemaining: 5 }, shipments: [] };
  await authenticate(page, order, tracking);
  await page.goto(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByText('5 days left to request a return or exchange')).toBeVisible();
  await page.getByRole('button', { name: 'Return or exchange' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Return an item')).toBeVisible();
  await expect(dialog.getByText('Exchange size or colour')).toBeVisible();
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
