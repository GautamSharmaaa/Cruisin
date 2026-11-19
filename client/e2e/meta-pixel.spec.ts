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

const pixelId = '100000000000001';
const orderId = '641000000000000000000001';

const confirmedOrder = {
  _id: orderId,
  id: orderId,
  metaPurchase: { eventId: 'purchase:' + orderId, pixelId, confirmedAt: new Date().toISOString() },
  orderNumber: 'CR-META-123',
  paymentMode: 'cod',
  paymentMethod: 'cod',
  paymentStatus: 'cod_pending',
  orderStatus: 'placed',
  shippingMethod: 'standard',
  subtotal: 2499,
  discount: 600,
  shipping: 90,
  tax: 0,
  codFee: 49,
  total: 2038,
  amountPaid: 0,
  amountDue: 2038,
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

interface BrowserCapture {
  logisticsQuoteId?: string;
  metaEventId?: string;
  checkoutConsentId?: string;
  consents: Array<{ consentId: string; granted: boolean; source?: 'default' | 'shopper' }>;
  events: Array<{ eventId: string; name: string; path: string }>;
}

const installMockApi = async (page: Page, capture: BrowserCapture): Promise<void> => {
  let savedAddress: Record<string, unknown> | undefined;
  let cartItems: Array<{ product: typeof product; variant: string; quantity: number; price: number }> = [];
  let version = 0;
  let couponCode: string | undefined;
  const cart = () => ({ items: cartItems, version, couponCode, couponDiscount: couponCode ? 600 : 0 });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    if (path === '/meta/consent') {
      const consent = request.postDataJSON() as BrowserCapture['consents'][number];
      capture.consents.push(consent);
      return fulfillJson(route, { granted: consent.granted, capiEnabled: consent.granted });
    }
    if (path === '/meta/events') {
      capture.events.push(request.postDataJSON() as BrowserCapture['events'][number]);
      return fulfillJson(route, { queued: true }, 202);
    }
    if (path === '/auth/refresh') return fulfillJson(route, { accessToken: 'playwright-access-token' });
    if (path === '/auth/me') return fulfillJson(route, { id: 'user-1', name: 'Test Customer', email: 'test@example.invalid', role: 'customer', isVerified: true, phone: '+919876543210' });
    if (path === '/auth/addresses' && request.method() === 'GET') return fulfillJson(route, savedAddress ? [savedAddress] : []);
    if (path === '/auth/addresses' && request.method() === 'POST') {
      const input = request.postDataJSON() as Record<string, unknown>;
      savedAddress = { _id: 'address-1', ...input };
      return fulfillJson(route, savedAddress);
    }
    if (path === '/wishlist' && request.method() === 'GET') return fulfillJson(route, { products: [] });
    if (path === '/wishlist/product-1' && request.method() === 'POST') return fulfillJson(route, { added: true });
    if (path === '/navigation') return fulfillJson(route, []);
    if (path === '/categories' || path === '/collections' || path === '/tags') return fulfillJson(route, []);
    if (path.startsWith('/page-settings/')) return fulfillJson(route, null);
    if (path === '/site-settings') return fulfillJson(route, { standardShippingRate: 90, expressShippingRate: 180, freeStandardShippingThreshold: 25000, isStorefrontNavigationVisible: true });
    if (path === '/payments/config') return fulfillJson(route, { paymentMode: 'test', codEnabled: true, codFee: 49, partialPaymentEnabled: false, minPartialPaymentOrderValue: 10000, maxCodOrderValue: 100000 });
    if (path === '/logistics/quotes' && request.method() === 'POST') {
      const { deliveryPostcode, paymentMode } = request.postDataJSON() as { deliveryPostcode: string; paymentMode: string };
      return fulfillJson(route, {
        quoteId: logisticsQuoteId,
        cartVersion: version,
        deliveryPostcode,
        paymentMode,
        options: [{ code: 'standard', label: 'Standard delivery', shippingCharge: 90, providerCost: 80, codCharge: 10, courierId: 1, courierName: 'Mock Express', shippingMode: 'surface', estimatedDeliveryDays: 3, codAvailable: true }],
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        package: { measurementConfirmed: true, warnings: [] }
      });
    }
    if (path === '/products/meta-jacket') return fulfillJson(route, product);
    if (path === '/products') return fulfillJson(route, { items: [product], page: 1, limit: 24, total: 1, pages: 1 });
    if (path === '/cart' && request.method() === 'GET') return fulfillJson(route, cart());
    if (path === '/cart/items' && ['PUT', 'POST'].includes(request.method())) {
      const body = request.postDataJSON() as { quantity: number; variant: string };
      cartItems = [{ product, variant: body.variant, quantity: body.quantity, price: 2499 }];
      version += 1;
      return fulfillJson(route, cart());
    }
    if (path === '/cart/sync') return fulfillJson(route, cart());
    if (path === '/cart/coupon' && request.method() === 'POST') {
      couponCode = 'SAVE600';
      version += 1;
      return fulfillJson(route, { coupon: couponCode, discount: 600, freeShipping: false, version });
    }
    if (path === '/orders/cod' && request.method() === 'POST') {
      const body = request.postDataJSON() as { logisticsQuoteId?: string; metaEventId?: string; meta?: { consentId: string } };
      capture.logisticsQuoteId = body.logisticsQuoteId;
      capture.metaEventId = body.metaEventId;
      capture.checkoutConsentId = body.meta?.consentId;
      cartItems = [];
      return fulfillJson(route, { order: confirmedOrder, payment: null, amountToPay: 0 });
    }
    if (path === '/orders/' + orderId) return fulfillJson(route, confirmedOrder);
    return fulfillJson(route, {});
  });
};

const metaCalls = (page: Page): Promise<unknown[][]> => page.evaluate(() => (window as unknown as CapturedWindow).__metaCalls);
const metaEventName = (call: unknown[]): unknown => call[0] === 'trackSingle' ? call[2] : call[1];
const metaEventPayload = (call: unknown[]): unknown => call[0] === 'trackSingle' ? call[3] : call[2];
const metaEventOptions = (call: unknown[]): unknown => call[0] === 'trackSingle' ? call[4] : call[3];

test('tracks the mocked storefront funnel once without contacting Meta or creating a real order', async ({ page }) => {
  const capture: BrowserCapture = { consents: [], events: [] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
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
  await installMockApi(page, capture);
  await page.route('**/api/pincode/110001', route => route.fulfill({ json: { city: 'Delhi', state: 'Delhi' } }));

  await page.goto('/shop');
  const marketing = page.getByRole('complementary', { name: 'Marketing cookies' });
  await expect(page.locator('html')).toHaveAttribute('data-cruisin-meta-bootstrap', 'ready');
  await expect(marketing).toHaveCount(0);
  await expect.poll(() => capture.consents).toEqual([expect.objectContaining({ granted: true, source: 'default' })]);
  await expect(page.getByRole('heading', { name: 'Shop All' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'PageView').length).toBe(1);
  expect(await page.evaluate(() => window.fbq?.disablePushState)).toBe(true);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.getByRole('button', { name: 'Search' }).first().click();
  const searchDialog = page.getByRole('dialog');
  await searchDialog.getByLabel('Search').fill('meta jacket');
  await searchDialog.getByRole('button', { name: product.title }).click();
  await expect(page.getByRole('heading', { name: product.title })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'PageView').length).toBe(2);
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'ViewContent').length).toBe(1);

  await page.getByRole('button', { name: 'Add to wishlist' }).click();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'AddToWishlist').length).toBe(1);

  await page.getByRole('button', { name: 'Size M' }).click();
  await page.getByRole('button', { name: 'Add To Cart' }).click();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'AddToCart').length).toBe(1);
  await page.getByRole('dialog').getByRole('link', { name: 'Proceed To Checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'InitiateCheckout').length).toBe(1);

  await page.getByRole('button', { name: 'Have another coupon?' }).click();
  await page.getByLabel('Coupon code').fill('save600');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('SAVE600', { exact: true })).toBeVisible();
  const orderSummary = page.getByRole('complementary');
  await expect(orderSummary.getByText('Coupon (SAVE600)', { exact: false })).toBeVisible();
  await expect(orderSummary.getByText('-₹600')).toBeVisible();

  await page.getByRole('button', { name: /Cash on delivery/ }).click();
  await page.getByRole('button', { name: /Add delivery address Enter/ }).click();
  const addressSheet = page.getByRole('dialog', { name: 'Add delivery address' });
  await addressSheet.getByLabel('Pincode').fill('110001');
  await addressSheet.getByLabel(/House \/ flat \/ building/).fill('1 Test Street');
  await addressSheet.getByLabel(/Area \/ sector \/ village/).fill('Connaught Place');
  await addressSheet.getByLabel(/Full name/).fill('Test Customer');
  await addressSheet.getByLabel(/Phone number/).fill('+919876543210');
  await expect(addressSheet.getByRole('button', { name: /Save & deliver here/ })).toBeEnabled();
  await addressSheet.getByRole('button', { name: /Save & deliver here/ }).click();
  await expect(addressSheet).toBeHidden();
  const placeOrder = page.getByRole('button', { name: /^Place COD order/ });
  await expect(placeOrder).toBeEnabled();
  await placeOrder.click();
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'Purchase').length).toBe(1);

  const calls = await metaCalls(page);
  const events = calls.filter((call) => call[0] === 'track' || call[0] === 'trackSingle').map(metaEventName);
  expect(events).toEqual(expect.arrayContaining(['PageView', 'Search', 'ViewContent', 'AddToWishlist', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase']));
  expect(events.indexOf('ViewContent')).toBeLessThan(events.indexOf('AddToCart'));
  expect(events.indexOf('AddToCart')).toBeLessThan(events.indexOf('InitiateCheckout'));
  expect(events.indexOf('InitiateCheckout')).toBeLessThan(events.indexOf('Purchase'));
  expect(capture.logisticsQuoteId).toBe(logisticsQuoteId);
  expect(capture.metaEventId).toMatch(/^checkout:/);
  expect(capture.checkoutConsentId).toBe(capture.consents.find(consent => consent.granted)?.consentId);
  await expect.poll(() => [...new Set(capture.events.map(event => event.name))]).toEqual(expect.arrayContaining([
    'PageView', 'Search', 'ViewContent', 'AddToWishlist', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo'
  ]));
  for (const call of calls.filter(call => call[0] === 'trackSingle' && metaEventName(call) !== 'Purchase')) {
    expect(capture.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: metaEventName(call), eventId: (metaEventOptions(call) as { eventID: string }).eventID })
    ]));
  }
  expect(capture.events.some(event => event.name === 'Purchase')).toBe(false);
  expect(JSON.stringify(capture.events)).not.toContain('search_string');
  const purchase = calls.find((call) => metaEventName(call) === 'Purchase');
  expect(purchase && metaEventPayload(purchase)).toMatchObject({ content_ids: ['variant-1'], value: 2038, currency: 'INR', order_id: orderId });
  expect(purchase && metaEventOptions(purchase)).toEqual({ eventID: 'purchase:' + orderId });
  expect(JSON.stringify(calls)).not.toContain('test@example.invalid');
  expect(JSON.stringify(calls)).not.toContain('+919876543210');
  await expect(page.locator('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveCount(1);
  expect(metaScriptRequests).toBe(1);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect.poll(async () => (await metaCalls(page)).filter((call) => metaEventName(call) === 'Purchase').length).toBe(1);

  await page.goto('/account/preferences');
  const profile = page.getByRole('region', { name: 'Marketing cookies' });
  await expect(profile.getByText('On for this browser')).toBeVisible();
  await profile.getByRole('button', { name: 'Cookie settings' }).click();
  await marketing.getByRole('button', { name: 'Turn off marketing' }).click();
  await expect(profile.getByText('Off for this browser')).toBeVisible();
  await expect.poll(() => capture.consents.at(-1)).toEqual({
    consentId: capture.checkoutConsentId, granted: false, pixelId, version: 1
  });
  const previousEvents = capture.events.length;
  const previousScripts = metaScriptRequests;
  await page.reload();
  await expect(profile.getByText('Off for this browser')).toBeVisible();
  await page.goto('/product/meta-jacket');
  await expect(page.getByRole('heading', { name: product.title })).toBeVisible();
  expect(capture.events).toHaveLength(previousEvents);
  expect(metaScriptRequests).toBe(previousScripts);
});

test('honors a mobile privacy signal after marketing was enabled by default', async ({ page }) => {
  const capture: BrowserCapture = { consents: [], events: [] };
  const consentId = '11111111-1111-4111-8111-111111111112';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.addInitScript(id => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    window.localStorage.setItem('cruisin:marketing-preference', JSON.stringify({
      choice: 'allowed', source: 'default', version: 1, expiresAt: Date.now() + 60_000, consentId: id, pendingRevocations: []
    }));
  }, consentId);
  await installMockApi(page, capture);

  await page.goto('/shop');
  await expect.poll(() => capture.consents).toEqual([{ consentId, pixelId, granted: false, version: 1 }]);
  await page.getByRole('button', { name: 'Cookie settings' }).click();
  const marketing = page.getByRole('complementary', { name: 'Marketing cookies' });
  await expect(marketing).toBeVisible();
  await expect(marketing.getByRole('button', { name: 'Allow marketing' })).toHaveCount(0);
  await expect(marketing.getByRole('button', { name: 'Turn off marketing' })).toBeInViewport();
  await expect(page.locator('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveCount(0);
  expect(capture.events).toHaveLength(0);
});
