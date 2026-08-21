import { expect, type APIRequestContext, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

const loginToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(apiUrl + '/auth/login', { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.accessToken as string;
};

test('admin delivery settings publish threshold and automatic promotions safely', async ({ page, request }) => {
  const token = await loginToken(request);
  const headers = { Authorization: 'Bearer ' + token };
  const original = (await (await request.get(apiUrl + '/admin/site-settings', { headers })).json()).data as Record<string, unknown>;

  try {
    await page.goto(adminUrl + '/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    await page.goto(adminUrl + '/delivery');
    await expect(page.getByRole('heading', { name: 'Delivery', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Delivery' })).toHaveAttribute('href', '/delivery');

    await page.getByLabel('Original price to strike out (₹)').fill('0');
    await page.getByLabel('Standard delivery charge (₹)').fill('99');
    await page.getByLabel('Original price to strike out (₹)').fill('99');
    await page.getByLabel('Express delivery charge (₹)').fill('199');
    await page.getByLabel('Free standard delivery above (₹)').fill('1000');
    await expect(page.getByText('Cart preview at threshold').locator('..')).toContainText('₹99');
    await expect(page.getByText('Cart preview at threshold').locator('..')).toContainText('Free');

    const thresholdSave = page.waitForResponse((response) => response.url().endsWith('/admin/site-settings') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Delivery Settings' }).click();
    expect((await (await thresholdSave).json()).data).toMatchObject({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1_000
    });
    await expect.poll(async () => (await (await request.get(apiUrl + '/site-settings')).json()).data).toMatchObject({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1_000
    });

    await page.getByLabel('Original price to strike out (₹)').fill('0');
    await page.getByLabel('Standard delivery charge (₹)').fill('0');
    await page.getByLabel('Original price to strike out (₹)').fill('99');
    await page.getByLabel('Free standard delivery above (₹)').fill('0');
    const belowThresholdPreview = page.getByText('Cart preview below threshold').locator('..');
    await expect(belowThresholdPreview).toContainText('₹99');
    await expect(belowThresholdPreview).toContainText('Free');
    await expect(page.getByText('Threshold promotion disabled')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Save Delivery Settings' })).toBeVisible();
  } finally {
    await request.put(apiUrl + '/admin/site-settings', { headers, data: original });
  }
});

test('guest checkout hides protected content until authentication resolves', async ({ page }) => {
  let releaseRefresh = (): void => undefined;
  const refreshHeld = new Promise<void>((resolve) => { releaseRefresh = resolve; });
  await page.addInitScript(() => window.localStorage.setItem('cruisin_has_session', 'true'));
  await page.route('**/auth/refresh', async (route) => {
    await refreshHeld;
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Authentication required' }) });
  });

  await page.goto(storefrontUrl + '/checkout');
  try {
    await expect(page.getByText('Checking your private client access...')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Address' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Shipping Method' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue to secure payment' })).toHaveCount(0);
  } finally {
    releaseRefresh();
  }

  await expect(page.getByRole('heading', { name: 'Continue securely' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue with WhatsApp' })).toHaveAttribute('href', '/login?redirect=%2Fcheckout');
});
