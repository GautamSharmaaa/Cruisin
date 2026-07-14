import { expect, type APIRequestContext, type Page, test } from '@playwright/test';
import fs from 'node:fs/promises';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';
const imageUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';

type CreatedRecords = {
  token: string;
  categoryId?: string;
  categorySlug?: string;
  productId?: string;
  productSlug?: string;
  couponId?: string;
  couponCode?: string;
};

const headers = (token: string): Record<string, string> => ({ Authorization: 'Bearer ' + token });

const loginToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(apiUrl + '/auth/login', { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.accessToken as string;
};

const adminLogin = async (page: Page): Promise<void> => {
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
};

const attachDiagnostics = (page: Page): { errors: string[]; failed: string[] } => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.includes('/_next/') || url.startsWith(storefrontUrl) || url.startsWith(adminUrl)) {
      failed.push(url + ' :: ' + (request.failure()?.errorText ?? 'failed'));
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() < 400 || url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.startsWith(storefrontUrl) || url.startsWith(adminUrl)) failed.push(url + ' :: HTTP ' + response.status());
  });
  return { errors, failed };
};

const expectNoImportantBrowserFailures = (diagnostics: { errors: string[]; failed: string[] }): void => {
  expect(diagnostics.errors.filter((entry) => !entry.includes('favicon'))).toEqual([]);
  expect(diagnostics.failed.filter((entry) => !entry.includes('.hot-update.') && !entry.includes('net::ERR_ABORTED'))).toEqual([]);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const adminCategoryBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; slug: string; name: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/categories', { headers: headers(token) })).json();
  return body.data.find((category: { slug: string }) => category.slug === slug);
};

const adminProductBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; slug: string; title: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/products/admin/catalogue', { headers: headers(token), params: { q: slug, limit: 100, status: 'all' } })).json();
  return body.data.items.find((product: { slug: string }) => product.slug === slug);
};

const adminCouponByCode = async (request: APIRequestContext, token: string, code: string): Promise<{ _id: string; code: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/coupons', { headers: headers(token) })).json();
  return body.data.find((coupon: { code: string }) => coupon.code === code);
};

const cleanup = async (request: APIRequestContext, records?: CreatedRecords): Promise<void> => {
  if (!records) return;
  const authHeaders = headers(records.token);
  if (records.couponId) await request.delete(apiUrl + '/admin/coupons/' + records.couponId, { headers: authHeaders }).catch(() => undefined);
  if (records.productId) await request.delete(apiUrl + '/products/' + records.productId, { headers: authHeaders }).catch(() => undefined);
  if (records.categoryId) await request.delete(apiUrl + '/admin/categories/' + records.categoryId, { headers: authHeaders }).catch(() => undefined);
};

test.describe('full admin dashboard browser QA', () => {
  let records: CreatedRecords | undefined;

  test.afterEach(async ({ request }) => {
    await cleanup(request, records);
    records = undefined;
  });

  test('loads every admin dashboard area and core controls without browser failures', async ({ page, isMobile }) => {
    test.skip(isMobile, 'full admin dashboard control sweep is covered in the desktop project');
    const diagnostics = attachDiagnostics(page);
    await adminLogin(page);

    const routes = [
      { path: '/', heading: 'Operations Overview', checks: ['Today Revenue', 'Orders', 'Active Products'] },
      { path: '/products', heading: 'Products', checks: ['All Products', 'Product Tools', 'Export CSV'] },
      { path: '/catalogues', heading: 'Catalogues', checks: ['Import', 'Export', 'Import History'] },
      { path: '/categories', heading: 'Categories', checks: ['New Category', 'Category Library', 'Search categories'] },
      { path: '/storefront', heading: 'Storefront', checks: ['Navigation', 'Mega Menu', 'Collections', 'Filters', 'Pages', 'Settings'] },
      { path: '/orders', heading: 'Orders', checks: ['Order status', 'Payment status', 'Reset Filters'] },
      { path: '/users', heading: 'Users', checks: ['Search customers', 'Role', 'Account status'] },
      { path: '/discounts', heading: 'Discounts', checks: ['Campaign Basics', 'Eligible products and categories', 'Coupons'] },
      { path: '/cms', heading: 'CMS Builder', checks: ['Add Section', 'Save Draft', 'Publish', 'Builder'] },
      { path: '/analytics', heading: 'Analytics', checks: ['Today', '30 days', '90 days', 'Refresh'] }
    ];

    for (const route of routes) {
      await page.goto(adminUrl + route.path);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      for (const text of route.checks) await expect(page.getByText(text).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.goto(adminUrl + '/orders');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    const orderDetails = page.getByRole('button', { name: 'Details' });
    if (await orderDetails.count()) {
      await orderDetails.first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close order detail' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }

    await page.goto(adminUrl + '/users');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    const userDetails = page.getByRole('button', { name: 'View customer details' });
    if (await userDetails.count()) {
      await userDetails.first().click();
      await expect(page.getByText('Customer detail')).toBeVisible();
      await page.getByRole('button', { name: 'Close customer details' }).click();
      await expect(page.getByText('Customer detail')).toHaveCount(0);
    }

    await page.goto(adminUrl + '/analytics');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Refresh analytics' }).click();
    await expect(page.getByText('Revenue trend')).toBeVisible();

    expectNoImportantBrowserFailures(diagnostics);
  });

  test('analytics date ranges, comparison KPIs, export, and responsive layout work', async ({ page, request }) => {
    const diagnostics = attachDiagnostics(page);
    await adminLogin(page);
    await page.goto(adminUrl + '/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Net revenue', { exact: true })).toBeVisible();
    await expect(page.getByText('Units sold', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^Refunds:/).getByText('Refunds', { exact: true })).toBeVisible();
    await expect(page.getByText('Revenue trend', { exact: true })).toBeVisible();
    await expect(page.getByText('Payment modes', { exact: true })).toBeVisible();
    await expect(page.getByText('Recent orders', { exact: true })).toBeVisible();

    const today = page.getByRole('button', { name: 'Today', exact: true });
    await today.click();
    await expect(today).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/comparison \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('analytics-summary.csv');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const exportedCsv = await fs.readFile(downloadPath as string, 'utf8');
    const token = await loginToken(request);
    const summaryResponse = await request.get(apiUrl + '/admin/analytics/summary', { headers: headers(token), params: { preset: 'today' } });
    expect(summaryResponse.ok()).toBeTruthy();
    const summaryBody = await summaryResponse.json();
    const exportedSummary = summaryBody.data;
    expect(exportedCsv).toContain(`"Net revenue","${exportedSummary.summary.netRevenue}","${exportedSummary.comparison.summary.netRevenue}"`);
    expect(exportedCsv).toContain(`"Orders","${exportedSummary.summary.totalOrders}","${exportedSummary.comparison.summary.totalOrders}"`);
    expect(exportedCsv).toContain(`"Refunds","${exportedSummary.summary.refunds}","${exportedSummary.comparison.summary.refunds}"`);
    await expectNoHorizontalOverflow(page);
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('creates admin merchandising records in the browser and verifies storefront behavior', async ({ page, request, isMobile }) => {
    test.setTimeout(180000);
    test.skip(isMobile, 'full browser CRUD and storefront verification is covered in the desktop project');
    const diagnostics = attachDiagnostics(page);
    const storefrontPage = await page.context().newPage();
    const storefrontDiagnostics = attachDiagnostics(storefrontPage);
    const token = await loginToken(request);
    records = { token };
    const stamp = Date.now();
    const slug = 'live-browser-admin-' + stamp;
    const categoryName = 'Live Browser Admin Category ' + stamp;
    const productTitle = 'Live Browser Admin Product ' + stamp;
    const couponCode = 'LIVEBROWSER' + String(stamp).slice(-6);

    await adminLogin(page);

    await page.goto(adminUrl + '/categories');
    await page.getByLabel('Category Name').fill(categoryName);
    await page.getByLabel('Category Slug').fill(slug);
    await page.getByLabel('Category Description').fill('Browser-created category for full admin QA.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Category created')).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: categoryName })).toHaveCount(1);
    await expect.poll(async () => {
      const category = await adminCategoryBySlug(request, token, slug);
      records!.categoryId = category?._id;
      records!.categorySlug = slug;
      return category?.name;
    }).toBe(categoryName);

    await storefrontPage.goto(storefrontUrl + '/category/' + slug);
    await storefrontPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await expect(storefrontPage.locator('main').last()).toBeVisible();
    await expect(storefrontPage.getByRole('heading', { name: categoryName })).toBeVisible();
    await expectNoHorizontalOverflow(storefrontPage);

    await page.goto(adminUrl + '/products/new');
    await page.getByLabel('Product Title').fill(productTitle);
    await page.getByLabel('Product Slug').fill(slug);
    await page.getByLabel('Product Short Description').fill('Automated merchandising verification copy.');
    await page.getByLabel('Product Description').fill('Temporary product created for dashboard verification.');
    await page.getByLabel('Product Rich Description').fill('Temporary rich product copy for dashboard verification.');

    await page.getByRole('button', { name: 'Media' }).click();
    await page.getByLabel('Main image URL').fill(imageUrl);
    await page.getByLabel('Image alt text').fill(productTitle);

    await page.getByRole('button', { name: 'Pricing' }).click();
    await page.getByLabel('Selling price').fill('1999');
    await page.getByLabel('MRP / compare-at price').fill('2499');

    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByLabel('Main SKU').fill('LBA-' + stamp);
    await page.getByRole('textbox', { name: 'Size *', exact: true }).fill('M');
    await page.getByLabel('Color *', { exact: true }).fill('Black');
    await page.getByLabel('Color hex *', { exact: true }).fill('#000000');
    await page.getByLabel('Stock *', { exact: true }).fill('8');

    await page.getByRole('button', { name: 'Categorization' }).click();
    await expect(records.categoryId).toBeTruthy();
    await page.getByLabel('Primary category').selectOption(records.categoryId as string);
    await page.getByLabel('Tags').fill('browser-qa, live-admin');

    await page.getByRole('button', { name: 'Shipping' }).click();
    await page.getByLabel('Material & care').fill('Machine wash cold.');
    await page.getByLabel('Shipping & returns').fill('QA product shipping copy.');

    await page.getByRole('button', { name: 'SEO' }).click();
    await page.getByLabel('SEO title').fill(productTitle + ' | Cruisin');
    await page.locator('textarea').fill('Browser-created product SEO description.');
    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(page).toHaveURL(adminUrl + '/products');
    await expect.poll(async () => {
      const product = await adminProductBySlug(request, token, slug);
      records!.productId = product?._id;
      records!.productSlug = slug;
      return product?.title;
    }).toBe(productTitle);
    await page.reload();
    await page.getByPlaceholder('Search products, SKU, product code, or slug').fill(slug);
    await expect.poll(async () => page.locator('input').evaluateAll((inputs, title) => inputs.some((input) => (input as HTMLInputElement).value === title), productTitle)).toBe(true);

    await storefrontPage.goto(storefrontUrl + '/product/' + slug);
    await storefrontPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await expect(storefrontPage.getByRole('heading', { name: productTitle })).toBeVisible();
    await expect(storefrontPage.getByRole('main').getByText('₹1,999').first()).toBeVisible();
    await storefrontPage.getByRole('group', { name: 'Available sizes' }).getByRole('button', { name: 'Size M', exact: true }).click();
    await expect(storefrontPage.getByRole('button', { name: 'Add To Cart' })).toBeEnabled();

    await storefrontPage.goto(storefrontUrl + '/category/' + slug);
    await storefrontPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await expect(storefrontPage.getByText(productTitle)).toBeVisible();

    await page.goto(adminUrl + '/discounts');
    await page.getByLabel('Code').fill(couponCode);
    await page.getByLabel('Value', { exact: true }).fill('10');
    await page.getByLabel('Minimum cart value').fill('0');
    await page.getByLabel('Total usage limit').fill('50');
    await page.getByLabel('Usage per customer').fill('5');
    await page.getByLabel('Valid From').fill('2026-01-01');
    await page.getByLabel('Valid Until').fill('2026-12-31');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Coupon created')).toBeVisible();
    await expect(page.getByText(couponCode)).toBeVisible();
    await expect.poll(async () => {
      const coupon = await adminCouponByCode(request, token, couponCode);
      records!.couponId = coupon?._id;
      records!.couponCode = couponCode;
      return coupon?.code;
    }).toBe(couponCode);

    await storefrontPage.goto(storefrontUrl + '/product/' + slug);
    await storefrontPage.evaluate(() => window.localStorage.clear());
    await storefrontPage.reload();
    await storefrontPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await storefrontPage.getByRole('group', { name: 'Available sizes' }).getByRole('button', { name: 'Size M', exact: true }).click();
    await storefrontPage.getByRole('button', { name: 'Add To Cart' }).click();
    await expect(storefrontPage.getByRole('dialog').getByText(productTitle)).toBeVisible();
    await storefrontPage.getByLabel('Coupon code').fill(couponCode);
    await storefrontPage.getByRole('button', { name: 'Apply' }).click();
    await expect(storefrontPage.getByText(couponCode + ' applied')).toBeVisible();

    expectNoImportantBrowserFailures(diagnostics);
    expectNoImportantBrowserFailures(storefrontDiagnostics);
  });
});
