import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';

const forbiddenCmsCopy = /\bQA(?:[-_ ]|$)|Browser Test|Lorem ipsum|Placeholder|Sample product/i;

const attachPageDiagnostics = (page: Page): { errors: string[]; failed: string[] } => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.includes('/_next/') || url.startsWith(storefrontUrl)) {
      failed.push(url + ' :: ' + (request.failure()?.errorText ?? 'failed'));
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() < 400 || url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.startsWith(storefrontUrl)) failed.push(url + ' :: HTTP ' + response.status());
  });
  return { errors, failed };
};

const expectNoImportantBrowserFailures = (diagnostics: { errors: string[]; failed: string[] }): void => {
  expect(diagnostics.errors.filter((entry) => !entry.includes('favicon') && !entry.startsWith('Failed to load resource:'))).toEqual([]);
  expect(diagnostics.failed.filter((entry) => !entry.includes('.hot-update.') && !entry.includes('net::ERR_ABORTED'))).toEqual([]);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const publicCms = async (request: APIRequestContext): Promise<Record<string, unknown>> => {
  const response = await request.get(apiUrl + '/cms/home');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data as Record<string, unknown>;
};

const hasKeyDeep = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value as Record<string, unknown>).some((entry) => hasKeyDeep(entry, key));
};

const closePopupIfVisible = async (page: Page): Promise<void> => {
  const close = page.locator('button[aria-label="Close popup"]');
  if (await close.isVisible().catch(() => false)) await close.click();
};

test.describe('production CMS homepage integration', () => {
  test('public CMS API returns published production sections and safe product payloads', async ({ request }) => {
    const cms = await publicCms(request);
    const sections = cms.sections as Array<Record<string, unknown>>;
    const serialized = JSON.stringify(cms);

    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(serialized).not.toMatch(forbiddenCmsCopy);
    expect(hasKeyDeep(cms, 'costPrice')).toBe(false);
    expect(hasKeyDeep(cms, 'rawCatalogueAttributes')).toBe(false);

    for (const sectionName of ['Cruisin Current Catalogue', 'The Drop', 'Best Sellers']) {
      expect(serialized).toContain(sectionName);
    }
    const productLinkedSections = sections.filter((section) => Array.isArray(section.products) && (section.products as unknown[]).length > 0);
    expect(productLinkedSections.length).toBeGreaterThanOrEqual(2);
    const linkedProducts = productLinkedSections.flatMap((section) => section.products as Array<Record<string, unknown>>);
    expect(linkedProducts.length).toBeGreaterThanOrEqual(8);
    for (const product of linkedProducts) {
      expect(product.title).toEqual(expect.any(String));
      expect(product.slug).toEqual(expect.any(String));
      expect(Array.isArray(product.variants)).toBe(true);
    }
  });

  test('homepage renders real CMS sections, images, links, and responsive layout without QA copy', async ({ page, request }) => {
    const cms = await publicCms(request);
    const sections = cms.sections as Array<Record<string, unknown>>;
    const expectedTitles = Array.from(new Set(sections.flatMap((section) => Array.isArray(section.products) ? (section.products as Array<{ title?: string }>).map((product) => product.title).filter((title): title is string => Boolean(title)) : [])));
    const diagnostics = attachPageDiagnostics(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await closePopupIfVisible(page);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(forbiddenCmsCopy);
    expect(body).toContain('Cruisin Current Catalogue');
    expect(body).toContain('The Drop');
    expect(body).toContain('Best Sellers');
    for (const productName of expectedTitles) expect(body).toContain(productName);
    expect(body).not.toContain('NaN');
    expect(await page.locator('img').count()).toBeGreaterThanOrEqual(8);
    expect(await page.locator('a[href^="/product/"]').count()).toBeGreaterThanOrEqual(8);
    await expectNoHorizontalOverflow(page);
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('PDP launched from CMS supports variant selection, cart drawer, and CMSHOME10 coupon', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await closePopupIfVisible(page);
    const cmsProductLink = page.locator('a[href="/product/phantom-windbreaker"]').first();
    await expect(cmsProductLink).toBeVisible();
    const cmsProductHref = await cmsProductLink.getAttribute('href');
    expect(cmsProductHref).toMatch(/^\/product\//);
    await page.goto(cmsProductHref as string);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const productHeading = page.locator('main h1');
    await expect(productHeading).toBeVisible();
    const productTitle = (await productHeading.innerText()).trim();
    const availableSizes = page.getByRole('group', { name: 'Available sizes' }).locator('button:not([disabled])');
    await expect(availableSizes.first()).toBeVisible();
    await availableSizes.first().click();
    await expect(page.getByRole('button', { name: 'Add To Cart', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Add To Cart', exact: true }).click();
    const cart = page.getByRole('dialog');
    await expect(cart.getByText(productTitle)).toBeVisible();

    await page.getByLabel('Coupon code').fill('CMSHOME10');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByText('CMSHOME10 applied')).toBeVisible();
    await expect(cart.getByText('Discount', { exact: true })).toBeVisible();
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('newsletter validates email, subscribes, and reports duplicate submission', async ({ page, request }) => {
    const cms = await publicCms(request);
    const sections = cms.sections as Array<{ type?: string }>;
    test.skip(!sections.some((section) => section.type === 'newsletter'), 'newsletter module is not published on the current homepage');
    const diagnostics = attachPageDiagnostics(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await closePopupIfVisible(page);

    const email = 'cms-real-e2e-' + Date.now() + '@example.com';
    const emailInput = page.getByPlaceholder('Email address');
    await expect(emailInput).toHaveCount(1);
    await emailInput.fill('not-an-email');
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    expect(await emailInput.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);

    await emailInput.fill(email);
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await expect(page.getByText('You are on the list.')).toBeVisible();
    await emailInput.fill(email);
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await expect(page.getByText('You are already on the list.')).toBeVisible();
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('recently viewed homepage rail is populated from a real PDP visit', async ({ page, request }) => {
    const cms = await publicCms(request);
    const sections = cms.sections as Array<{ type?: string }>;
    test.skip(!sections.some((section) => section.type === 'recently_viewed'), 'recently viewed module is not published on the current homepage');
    await page.goto('/product/void-drape-hoodie');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.getByRole('heading', { name: 'Void Drape Hoodie', exact: true })).toBeVisible();

    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await closePopupIfVisible(page);
    const recentText = await page.locator('body').innerText();
    const recentIndex = recentText.indexOf('Recently Viewed');
    expect(recentIndex).toBeGreaterThanOrEqual(0);
    expect(recentText.slice(recentIndex, recentIndex + 500)).toContain('Void Drape Hoodie');
    await expectNoHorizontalOverflow(page);
  });
});
