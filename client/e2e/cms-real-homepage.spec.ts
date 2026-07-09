import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';

const realProducts = [
  'Void Drape Hoodie',
  'Minimalist Heavyweight Tee',
  'Signal Cargo Trouser',
  'Apex Utility Jogger',
  'Cyber Cargo Pants',
  'Phantom Windbreaker'
];

const forbiddenCmsCopy = /QA CMS|Browser Test|Lorem ipsum|Placeholder|Sample product/i;

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

    expect(sections.length).toBeGreaterThanOrEqual(16);
    expect(serialized).not.toMatch(forbiddenCmsCopy);
    expect(hasKeyDeep(cms, 'costPrice')).toBe(false);
    expect(hasKeyDeep(cms, 'rawCatalogueAttributes')).toBe(false);

    for (const sectionName of ['Luxury Streetwear Essentials', 'Limited Drop', 'The Drop', 'Black Transit', 'Trending Now', 'Best Sellers']) {
      expect(serialized).toContain(sectionName);
    }
    for (const productName of realProducts) {
      expect(serialized).toContain(productName);
    }

    const productLinkedSections = sections.filter((section) => Array.isArray(section.products) && (section.products as unknown[]).length > 0);
    expect(productLinkedSections.length).toBeGreaterThanOrEqual(6);
  });

  test('homepage renders real CMS sections, images, links, and responsive layout without QA copy', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await closePopupIfVisible(page);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(forbiddenCmsCopy);
    expect(body).toContain('Luxury Streetwear Essentials');
    expect(body).toContain('CMSHOME10');
    for (const productName of realProducts) expect(body).toContain(productName);
    expect(body).not.toContain('NaN');
    expect(await page.locator('img').count()).toBeGreaterThanOrEqual(20);
    expect(await page.locator('a[href^="/product/"]').count()).toBeGreaterThanOrEqual(12);
    expect(await page.locator('a[href^="/collections/"]').count()).toBeGreaterThanOrEqual(3);
    await expectNoHorizontalOverflow(page);
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('PDP launched from CMS supports variant selection, cart drawer, and CMSHOME10 coupon', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    await page.goto('/product/void-drape-hoodie');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    await expect(page.getByRole('heading', { name: 'Void Drape Hoodie', exact: true })).toBeVisible();
    await expect(page.getByText('₹18,900')).toBeVisible();
    await page.locator('main').getByRole('button', { name: 'S', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add To Cart', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Add To Cart', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('Void Drape Hoodie')).toBeVisible();

    await page.getByLabel('Coupon code').fill('CMSHOME10');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByText('CMSHOME10 applied')).toBeVisible();
    await expect(page.getByText('-₹1,000')).toBeVisible();
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('newsletter validates email, subscribes, and reports duplicate submission', async ({ page }) => {
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

  test('recently viewed homepage rail is populated from a real PDP visit', async ({ page }) => {
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
