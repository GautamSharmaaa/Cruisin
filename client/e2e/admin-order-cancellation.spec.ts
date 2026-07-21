import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const orderId = '66a000000000000000000002';
const envelope = (data: unknown, message = 'OK'): string => JSON.stringify({ success: true, data, message });

interface MockCancellation {
  requestedBy: 'customer' | 'admin';
  reasonCode: string;
  reason: string;
  details?: string;
  requestedAt: string;
  cancelledAt: string;
  refundStatus: string;
  refundAmount: number;
}

interface MockRefund {
  providerRefundId: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: string;
}

interface MockOrder {
  [key: string]: unknown;
  id: string;
  _id: string;
  orderNumber: string;
  paymentStatus: string;
  refundAmount: number;
  cancellation: MockCancellation;
  refunds: MockRefund[];
}

test('admin reviews cancellation, issues the bounded refund, and synchronizes Razorpay status', async ({ page }) => {
  const admin = { id: 'admin-id', _id: 'admin-id', name: 'QA Superadmin', email: 'admin@example.com', role: 'superadmin', isVerified: true, isActive: true };
  let refundRequest: Record<string, unknown> | undefined;
  let syncRequests = 0;
  let order: MockOrder = {
    id: orderId,
    _id: orderId,
    orderNumber: 'CR-ADMIN-CANCEL-QA',
    user: 'customer-id',
    orderStatus: 'cancelled',
    paymentStatus: 'paid',
    paymentMethod: 'razorpay',
    paymentMode: 'online',
    paymentProvider: 'razorpay',
    shippingMethod: 'standard',
    subtotal: 700,
    discount: 13,
    couponCode: 'WELCOME13',
    shipping: 99,
    tax: 126,
    codFee: 0,
    total: 912,
    amountPaid: 912,
    amountDue: 0,
    refundAmount: 0,
    razorpayOrderId: 'order_test_safe_admin',
    razorpayPaymentId: 'pay_test_safe_admin',
    createdAt: '2026-07-21T18:30:00.000Z',
    shippingAddress: { fullName: 'Gautam Sharma', phone: '+919876543210', line1: '42 Test Avenue', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
    items: [{ title: 'Razorpay Test Mode QA Tee', sku: 'QA-RZP-TEE-ONE', size: 'M', color: 'Test Black', quantity: 1, price: 700, image: '/placeholder.svg' }],
    cancellation: { requestedBy: 'customer', reasonCode: 'wrong_item', reason: 'Ordered the wrong size or item', details: 'I selected the wrong size while checking out.', requestedAt: '2026-07-21T18:35:00.000Z', cancelledAt: '2026-07-21T18:35:00.000Z', refundStatus: 'required', refundAmount: 0 },
    refunds: [],
    timeline: [{ status: 'paid', timestamp: '2026-07-21T18:31:00.000Z', note: 'Payment signature verified' }, { status: 'cancelled', timestamp: '2026-07-21T18:35:00.000Z', note: 'Customer cancelled: Ordered the wrong size or item' }]
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-browser-qa-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith('/admin/overview')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ revenue: 912, orders: 1, users: 1, products: 1, conversionRate: 1 }) });
    if (path.endsWith('/admin/analytics')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
    if (path.endsWith(`/admin/orders/${orderId}/refund`) && request.method() === 'POST') {
      refundRequest = request.postDataJSON() as Record<string, unknown>;
      const reason = String(refundRequest.reason ?? '');
      order = { ...order, cancellation: { ...order.cancellation, refundStatus: 'pending' }, refunds: [{ providerRefundId: 'rfnd_test_safe_admin', amount: 912, status: 'pending', reason, createdAt: '2026-07-21T18:40:00.000Z' }] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'rfnd_test_safe_admin', amount: 912, status: 'pending' }, 'Refund requested') });
    }
    if (path.endsWith(`/admin/orders/${orderId}/sync-refund`) && request.method() === 'POST') {
      syncRequests += 1;
      order = { ...order, paymentStatus: 'refunded', refundAmount: 912, cancellation: { ...order.cancellation, refundStatus: 'refunded', refundAmount: 912 }, refunds: order.refunds.map((refund) => ({ ...refund, status: 'processed' })) };
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order, 'Refund status synchronized') });
    }
    if (path.endsWith(`/admin/orders/${orderId}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order) });
    if (path.endsWith('/admin/orders')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([order]) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await page.goto(`${adminUrl}/login`);
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('TestOnlyPassword1');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(`${adminUrl}/`);
  await page.getByRole('link', { name: 'Orders', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  await expect(page.getByText('Ordered the wrong size or item')).toBeVisible();
  await expect(page.getByText('Refund required', { exact: false })).toBeVisible();
  await expect(page.getByText('Refund action').locator('..')).toContainText('1');
  await page.getByRole('link', { name: 'CR-ADMIN-CANCEL-QA' }).click();

  await expect(page.getByRole('heading', { name: 'Order Detail' })).toBeVisible();
  await expect(page.getByText('Cancellation request')).toBeVisible();
  await expect(page.getByText('I selected the wrong size while checking out.')).toBeVisible();
  await expect(page.getByText('Refund Required')).toBeVisible();
  await expect(page.getByLabel('Status').locator('option')).toHaveCount(1);
  await expect(page.getByRole('columnheader', { name: 'Photo' })).toBeVisible();
  await expect(page.getByAltText('Razorpay Test Mode QA Tee — Test Black')).toBeVisible();

  await page.getByRole('button', { name: 'Max' }).click();
  await expect(page.getByLabel('Refund amount (max ₹912)')).toHaveValue('912');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Issue Razorpay refund' }).click();

  await expect.poll(() => refundRequest).toBeTruthy();
  expect(refundRequest?.amount).toBe(912);
  expect(String(refundRequest?.reason)).toContain('Order cancellation: Ordered the wrong size or item');
  expect(typeof refundRequest?.idempotencyKey).toBe('string');
  await expect(page.getByText('Refund Pending')).toBeVisible();
  await expect(page.getByText('Refund submitted to Razorpay.')).toBeVisible();

  await page.getByRole('button', { name: 'Sync refund status' }).click();
  await expect.poll(() => syncRequests).toBe(1);
  await expect(page.getByText('Refund Refunded')).toBeVisible();
  await expect(page.getByText('Refund status synchronized with Razorpay.')).toBeVisible();
  await expect(page.getByText('Processed', { exact: true })).toBeVisible();
  await expect(page.getByText('rfnd_test_safe_admin')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('partial-payment cancellation refunds only the captured advance', async ({ page }) => {
  const partialOrderId = '66a000000000000000000003';
  const admin = { id: 'admin-id', _id: 'admin-id', name: 'QA Superadmin', email: 'admin@example.com', role: 'superadmin', isVerified: true, isActive: true };
  let refundRequest: Record<string, unknown> | undefined;
  let order: MockOrder = {
    id: partialOrderId,
    _id: partialOrderId,
    orderNumber: 'CR-PARTIAL-REFUND-QA',
    user: 'customer-id',
    orderStatus: 'cancelled',
    paymentStatus: 'partially_paid',
    paymentMethod: 'razorpay',
    paymentMode: 'partial',
    paymentProvider: 'razorpay',
    shippingMethod: 'standard',
    subtotal: 847.46,
    discount: 0,
    shipping: 0,
    tax: 152.54,
    codFee: 0,
    total: 1_000,
    amountPaid: 250,
    amountDue: 0,
    refundAmount: 0,
    razorpayOrderId: 'order_test_partial_refund',
    razorpayPaymentId: 'pay_test_partial_refund',
    createdAt: '2026-07-21T19:00:00.000Z',
    shippingAddress: { fullName: 'Partial Refund QA', phone: '+919876543210', line1: '25 Advance Road', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
    items: [{ title: 'Partial Payment QA Tee', sku: 'QA-PARTIAL-TEE', size: 'M', color: 'Test Black', quantity: 1, price: 847.46, image: '/placeholder.svg' }],
    cancellation: { requestedBy: 'customer', reasonCode: 'changed_mind', reason: 'Changed my mind', requestedAt: '2026-07-21T19:05:00.000Z', cancelledAt: '2026-07-21T19:05:00.000Z', refundStatus: 'required', refundAmount: 0 },
    refunds: [],
    timeline: [{ status: 'partially_paid', timestamp: '2026-07-21T19:01:00.000Z', note: 'Payment signature verified' }, { status: 'cancelled', timestamp: '2026-07-21T19:05:00.000Z', note: 'Customer cancelled: Changed my mind' }]
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ user: admin, accessToken: 'admin-partial-refund-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(admin) });
    if (path.endsWith(`/admin/orders/${partialOrderId}/refund`) && request.method() === 'POST') {
      refundRequest = request.postDataJSON() as Record<string, unknown>;
      order = { ...order, cancellation: { ...order.cancellation, refundStatus: 'pending' }, refunds: [{ providerRefundId: 'rfnd_test_partial', amount: 250, status: 'pending', reason: String(refundRequest.reason ?? ''), createdAt: '2026-07-21T19:10:00.000Z' }] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'rfnd_test_partial', amount: 250, status: 'pending' }, 'Refund requested') });
    }
    if (path.endsWith(`/admin/orders/${partialOrderId}/sync-refund`) && request.method() === 'POST') {
      order = { ...order, paymentStatus: 'refunded', refundAmount: 250, cancellation: { ...order.cancellation, refundStatus: 'refunded', refundAmount: 250 }, refunds: order.refunds.map((refund) => ({ ...refund, status: 'processed' })) };
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order, 'Refund status synchronized') });
    }
    if (path.endsWith(`/admin/orders/${partialOrderId}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order) });
    if (path.endsWith('/admin/orders')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([order]) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await page.goto(`${adminUrl}/login`);
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('TestOnlyPassword1');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(`${adminUrl}/`);
  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  await page.getByRole('link', { name: 'CR-PARTIAL-REFUND-QA' }).click();

  const refundAmount = page.getByLabel('Refund amount (max ₹250)');
  await expect(refundAmount).toBeVisible();
  await refundAmount.fill('1000');
  await expect(page.getByRole('button', { name: 'Issue Razorpay refund' })).toBeDisabled();
  await page.getByRole('button', { name: 'Max' }).click();
  await expect(refundAmount).toHaveValue('250');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Issue Razorpay refund' }).click();

  await expect.poll(() => refundRequest?.amount).toBe(250);
  await expect(page.getByText('Refund Pending')).toBeVisible();
  await expect(page.getByText('In refund processing')).toBeVisible();
  await page.getByRole('button', { name: 'Sync refund status' }).click();
  await expect(page.getByText('Refund Refunded')).toBeVisible();
  await expect(page.getByText('In refund processing')).toHaveCount(0);
  await expect(page.getByText('rfnd_test_partial')).toBeVisible();
});
