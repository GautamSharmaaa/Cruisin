import { expect, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const orderId = '66a000000000000000000001';

const envelope = (data: unknown, message = 'OK'): string => JSON.stringify({ success: true, data, message });

test('customer reviews a detailed order and completes the guarded cancellation flow', async ({ page }) => {
  let submittedCancellation: Record<string, unknown> | undefined;
  let order = {
    id: orderId,
    _id: orderId,
    orderNumber: 'CR-CANCEL-QA-001',
    orderStatus: 'confirmed',
    paymentStatus: 'paid',
    paymentMode: 'online',
    paymentMethod: 'razorpay',
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
    razorpayOrderId: 'order_test_safe_identifier',
    razorpayPaymentId: 'pay_test_safe_identifier',
    createdAt: '2026-07-21T18:30:00.000Z',
    shippingAddress: { fullName: 'Gautam Sharma', phone: '+919876543210', line1: '42 Test Avenue', line2: 'Near Studio Lane', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
    billingAddress: { fullName: 'Gautam Sharma', phone: '+919876543210', line1: '42 Test Avenue', line2: 'Near Studio Lane', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
    items: [{ product: 'product-id', variant: 'variant-id', title: 'Razorpay Test Mode QA Tee', sku: 'QA-RZP-TEE-ONE', size: 'M', color: 'Test Black', quantity: 1, price: 700, image: '/cruisin-image-fallback.svg' }],
    refunds: [],
    timeline: [{ status: 'confirmed', timestamp: '2026-07-21T18:31:00.000Z', note: 'Payment signature verified' }]
  };

  await page.addInitScript(() => window.localStorage.setItem('cruisin_has_session', 'true'));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'browser-qa-token' }) });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: 'customer-id', name: 'Gautam Sharma', email: 'gautam@example.com', role: 'customer', isVerified: true, isActive: true }) });
    if (path.endsWith('/wishlist')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ products: [] }) });
    if (path.endsWith('/navigation')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
    if (path.endsWith('/site-settings')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ isStorefrontNavigationVisible: true, standardShippingRate: 99, freeStandardShippingThreshold: 1_000 }) });
    if (path.endsWith('/orders/mine')) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([order]) });
    if (path.endsWith(`/orders/${orderId}/cancel`) && request.method() === 'POST') {
      submittedCancellation = request.postDataJSON() as Record<string, unknown>;
      order = {
        ...order,
        orderStatus: 'cancelled',
        paymentStatus: 'paid',
        cancellation: {
          requestedBy: 'customer',
          reasonCode: 'other',
          reason: 'Other reason',
          details: String(submittedCancellation.details ?? ''),
          requestedAt: '2026-07-21T18:35:00.000Z',
          cancelledAt: '2026-07-21T18:35:00.000Z',
          refundStatus: 'required',
          refundAmount: 0
        },
        timeline: [...order.timeline, { status: 'cancelled', timestamp: '2026-07-21T18:35:00.000Z', note: `Customer cancelled: Other reason — ${String(submittedCancellation.details ?? '')}` }]
      } as typeof order;
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order, 'Order cancelled') });
    }
    if (path.endsWith(`/orders/${orderId}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(order) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) });
  });

  await page.goto(`${storefrontUrl}/checkout/success?order=${orderId}`);
  await expect(page.getByRole('heading', { name: 'Order Confirmed', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Purchased items' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
  await expect(page.getByText('Razorpay Test Mode QA Tee')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto(`${storefrontUrl}/account/orders`);
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Razorpay Test Mode QA Tee' })).toBeVisible();
  await expect(page.getByText('Delivering to Delhi, Delhi 110001')).toBeVisible();
  await expect(page.getByText('₹912').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole('button', { name: 'Cancel order' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel this order?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Select a reason to continue' })).toBeDisabled();
  await dialog.getByRole('radio', { name: /Other reason/ }).check();
  await expect(dialog.getByRole('button', { name: /Confirm cancellation in 5s/ })).toBeDisabled();
  await expect(dialog.getByPlaceholder('Please enter at least 10 characters')).toHaveAttribute('required', '');
  await dialog.getByPlaceholder('Please enter at least 10 characters').fill('I need delivery to a different city.');
  const confirm = dialog.getByRole('button', { name: 'Confirm cancellation', exact: true });
  await expect(confirm).toBeEnabled({ timeout: 7_000 });
  await confirm.click();

  await expect(dialog).toHaveCount(0);
  expect(submittedCancellation).toEqual({ reasonCode: 'other', details: 'I need delivery to a different city.' });
  await expect(page.getByText('Cancelled: Other reason')).toBeVisible();
  await expect(page.getByText('Refund: Required')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);

  await page.getByRole('link', { name: /View details/ }).click();
  await expect(page).toHaveURL(`${storefrontUrl}/account/orders/${orderId}`);
  await expect(page.getByRole('heading', { name: 'Items in your order' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bill breakdown' })).toBeVisible();
  await expect(page.getByText('WELCOME13')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
  await expect(page.getByText('42 Test Avenue')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cancellation & refund' })).toBeVisible();
  await expect(page.getByText('Your cancellation is recorded.')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
