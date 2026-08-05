import { expect, test, type Page, type Route } from '@playwright/test';

interface CapturedWindow extends Window {
  __metaCalls: unknown[][];
}

const product = {
  _id: 'product-1',
  id: 'product-1',
  title: 'Cruisin Meta Jacket',
  slug: 'meta-jacket',
  description: 'A test-only jacket.',
  richDescription: 'A test-only jacket used by Playwright.',
  brand: 'Cruisin',
  category: 'outerwear',
  categoryIds: ['outerwear'],
  collections: [],
  images: [{ url: '/cruisin-image-fallback.svg', alt: 'Cruisin Meta Jacket', width: 1200, height: 1600 }],
  basePrice: 2499,
  variants: [{ _id: 'variant-1', id: 'variant-1', size: 'M', color: 'Black', colorHex: '#000000', sku: 'META-JACKET-M', price: 2499, stock: 3, enabled: true, images: [] }],
  tags: ['test'],
  isFeatured: false,
  ratings: { avg: 0, count: 0 },
  seo: { metaTitle: 'Cruisin Meta Jacket', metaDesc: 'Test jacket', ogImage: '' },
  reviews: []
};

const confirmedOrder = {
  _id: 'order-123',
  id: 'order-123',
  orderNumber: 'CR-META-123',
  paymentMode: 'cod',
  paymentMethod: 'cod',
  paymentStatus: 'cod_pending',
  orderStatus: 'placed',
  shippingMethod: 'standard',
  subtotal: 2499,
  discount: 0,
  shipping: 90,
  tax: 0,
  codFee: 0,
  total: 2589,
  amountPaid: 0,
  amountDue: 2589,
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
  items: [{ productId: 'product-1', variantId: 'variant-1', product: 'product-1', variant: 'variant-1', title: product.title, sku: 'META-JACKET-M', size: 'M', color: 'Black', quantity: 1, price: 2499, image: '/cruisin-image-fallback.svg' }],
  shippingAddress: { fullName: 'Test Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
  timeline: []
};

const envelope = (data: unknown): string => JSON.stringify({ success: true, data, message: 'ok' });

const fulfillJson = async (route: Route, data: unknown, status = 200): Promise<void> => {
  await route.fulfill({ status, contentType: 'application/json', body: envelope(data) });
};

const logisticsQuoteId = '11111111-1111-4111-8111-111111111111';

const installMockApi = async (page: Page, capturedCheckout: { logisticsQuoteId?: string; metaEventId?: string }): Promise<void> => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    if (path === '/auth/refresh') return fulfillJson(route, { accessToken: 'playwright-access-token' });
    if (path === '/auth/me') return fulfillJson(route, { id: 'user-1', name: 'Test Customer', email: 'test@example.invalid', role: 'customer', isVerified: true, phone: '+919876543210' });
    if (path === '/wishlist' && request.method() === 'GET') return fulfillJson(route, { products: [] });
    if (path === '/wishlist/product-1' && request.method() === 'POST') return fulfillJson(route, { added: true });
    if (path === '/navigation') return fulfillJson(route, []);
    if (path === '/categories' || path === '/collections' || path === '/tags') return fulfillJson(route, []);
    if (path.startsWith('/page-settings/')) return fulfillJson(route, null);
    if (path === '/site-settings') return fulfillJson(route, { standardShippingRate: 90, expressShippingRate: 180, freeStandardShippingThreshold: 25000, isStorefrontNavigationVisible: true });
    if (path === '/payments/config') return fulfillJson(route, { paymentMode: 'test', codEnabled: true, partialPaymentEnabled: false, minPartialPaymentOrderValue: 10000, maxCodOrderValue: 100000 });
    if (path === '/logistics/quotes' && request.method() === 'POST') return fulfillJson(route, {
      quoteId: logisticsQuoteId,
      deliveryPostcode: '110001',
      paymentMode: 'cod',
      options: [{ code: 'standard', label: 'Standard delivery', shippingCharge: 90, providerCost: 80, codCharge: 10, courierId: 1, courierName: 'Mock Express', shippingMode: 'surface', estimatedDeliveryDays: 3, codAvailable: true }],
      expiresAt: '2026-08-05T12:00:00.000Z',
      package: { measurementConfirmed: true, warnings: [] }
    });
    if (path === '/products/meta-jacket') return fulfillJson(route, product);
    if (path === '/products') return fulfillJson(route, { items: [product], page: 1, limit: 24, total: 1, pages: 1 });
    if (path === '/cart' && request.method() === 'GET') return fulfillJson(route, { items: [] });
    if (path === '/cart/items' && ['PUT', 'POST'].includes(request.method())) return fulfillJson(route, { ok: true });
    if (path === '/orders/cod' && request.method() === 'POST') {
      const body = request.postDataJSON() as { logisticsQuoteId?: string; metaEventId?: string };
      capturedCheckout.logisticsQuoteId = body.logisticsQuoteId;
      capturedCheckout.metaEventId = body.metaEventId;
      return fulfillJson(route, { order: confirmedOrder, payment: null, amountToPay: 0 });
    }
    if (path === '/orders/order-123') return fulfillJson(route, confirmedOrder);
    return fulfillJson(route, {});
  });
};

const metaCalls = (page: Page): Promise<unknown[][]> => page.evaluate(() => (window as unknown as CapturedWindow).__metaCalls);

test('tracks the mocked storefront funnel once without contacting Meta or creating a real order', async ({ page }) => {
  const capturedCheckout: { logisticsQuoteId?: string; metaEventId?: string } = {};
  let metaScriptRequests = 0;
  await page.addInitScript(() => {
    window.localStorage.setItem('cruisin_has_session', 'true');
    const stored = JSON.parse(window.localStorage.getItem('__playwright_meta_calls') ?? '[]') as unknown[][];
    const target = window as unknown as CapturedWindow;
    target.__metaCalls = stored;
  });
  await page.route(/^https:\/\/connect\.facebook\.net\/.*/, async (route) => {
    metaScriptRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(function(){
        var queue=Array.isArray(window.fbq&&window.fbq.queue)?window.fbq.queue.slice():[];
        window.fbq.callMethod=function(){
          var args=Array.prototype.slice.call(arguments);
          window.__metaCalls.push(args);
          window.localStorage.setItem('__playwright_meta_calls',JSON.stringify(window.__metaCalls));
        };
        queue.forEach(function(args){window.fbq.callMethod.apply(window.fbq,args)});
        window.fbq.queue=[];
      })();`
    });
  });
  await installMockApi(page, capturedCheckout);

  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: 'Shop All' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[0] === 'track' && call[1] === 'PageView').length).toBe(1);

  await page.getByRole('button', { name: 'Search' }).first().click();
  const searchDialog = page.getByRole('dialog');
  await searchDialog.getByLabel('Search').fill('meta jacket');
  await searchDialog.getByRole('button', { name: product.title }).click();
  await expect(page.getByRole('heading', { name: product.title })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[0] === 'track' && call[1] === 'PageView').length).toBe(2);
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[0] === 'track' && call[1] === 'ViewContent').length).toBe(1);

  await page.getByRole('button', { name: 'Add to wishlist' }).click();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'AddToWishlist').length).toBe(1);

  await page.getByRole('button', { name: 'Size M' }).click();
  await page.getByRole('button', { name: 'Add To Cart' }).click();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'AddToCart').length).toBe(1);
  await page.getByRole('dialog').getByRole('link', { name: 'Proceed To Checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'InitiateCheckout').length).toBe(1);

  await page.getByRole('button', { name: /Cash on delivery/ }).click();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'AddPaymentInfo').length).toBe(1);
  await page.getByLabel('Full name').fill('Test Customer');
  await page.getByLabel('Phone').fill('+919876543210');
  await page.getByLabel('Address').fill('1 Test Street');
  await page.getByLabel('City').fill('Delhi');
  await page.getByLabel('State').fill('Delhi');
  await page.getByLabel('Postal code').fill('110001');
  await page.getByRole('button', { name: 'Place COD order' }).click();
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'Purchase').length).toBe(1);

  const calls = await metaCalls(page);
  const events = calls.filter((call) => call[0] === 'track').map((call) => call[1]);
  expect(events).toEqual(expect.arrayContaining(['PageView', 'Search', 'ViewContent', 'AddToWishlist', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase']));
  expect(events.indexOf('ViewContent')).toBeLessThan(events.indexOf('AddToCart'));
  expect(events.indexOf('AddToCart')).toBeLessThan(events.indexOf('InitiateCheckout'));
  expect(events.indexOf('InitiateCheckout')).toBeLessThan(events.indexOf('Purchase'));
  expect(capturedCheckout.logisticsQuoteId).toBe(logisticsQuoteId);
  expect(capturedCheckout.metaEventId).toMatch(/^checkout:/);
  const purchase = calls.find((call) => call[1] === 'Purchase');
  expect(purchase?.[2]).toMatchObject({ content_ids: ['variant-1'], value: 2589, currency: 'INR', order_id: 'order-123' });
  expect(purchase?.[3]).toEqual({ eventID: 'purchase:order-123' });
  expect(JSON.stringify(calls)).not.toContain('test@example.invalid');
  expect(JSON.stringify(calls)).not.toContain('+919876543210');
  await expect(page.locator('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveCount(1);
  expect(metaScriptRequests).toBe(1);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => call[1] === 'Purchase').length).toBe(1);
});
