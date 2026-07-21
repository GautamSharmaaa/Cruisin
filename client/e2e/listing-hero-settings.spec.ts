import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

const loginToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(apiUrl + '/auth/login', { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data.accessToken as string;
};

const signIntoAdmin = async (page: Page): Promise<void> => {
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
};

test('admin globally disables listing hero backgrounds without deleting their media', async ({ page, request }) => {
  const token = await loginToken(request);
  const headers = { Authorization: 'Bearer ' + token };
  const original = (await (await request.get(apiUrl + '/admin/site-settings', { headers })).json()).data as Record<string, unknown>;

  try {
    await request.put(apiUrl + '/admin/site-settings', { headers, data: { ...original, isListingHeroMediaEnabled: true } });
    await signIntoAdmin(page);
    await page.goto(adminUrl + '/storefront');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();

    const toggle = page.getByLabel('Listing hero backgrounds');
    await expect(toggle).toBeChecked();

    await page.goto(storefrontUrl + '/new-featured');
    await expect(page.getByTestId('listing-hero-media')).toBeVisible();

    await page.goto(adminUrl + '/storefront');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const save = page.waitForResponse((response) => response.url().endsWith('/admin/site-settings') && response.request().method() === 'PUT');
    await page.getByLabel('Listing hero backgrounds').click();
    expect((await (await save).json()).data.isListingHeroMediaEnabled).toBe(false);
    await expect(page.getByLabel('Listing hero backgrounds')).not.toBeChecked();

    for (const path of ['/shop', '/new-featured', '/men', '/women', '/sale', '/collections', '/collections/black-transit', '/category/men']) {
      await page.goto(storefrontUrl + path);
      await expect(page.getByTestId('listing-hero-media')).toHaveCount(0);
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }

    const pageSettings = (await (await request.get(apiUrl + '/page-settings/landing/new-featured')).json()).data;
    const collection = (await (await request.get(apiUrl + '/collections/black-transit')).json()).data;
    expect(pageSettings.heroImage).toBeTruthy();
    expect(collection.heroImage).toBeTruthy();
  } finally {
    await request.put(apiUrl + '/admin/site-settings', { headers, data: original });
  }
});
