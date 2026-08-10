import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

const expectNoHorizontalOverflow = async (page: import('@playwright/test').Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

test.describe('supported cross-browser smoke contract', () => {
  test.describe.configure({ timeout: 60_000 });

  test('homepage, menu, catalogue, and PDP interactions work', async ({ page, isMobile }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: isMobile ? 'Menu' : 'Cruisin menu' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await expect(firstProductLink).toBeVisible();
    const productHref = await firstProductLink.getAttribute('href');
    const productTitle = (await firstProductLink.getByRole('heading').textContent())?.trim();
    expect(productHref).toBeTruthy();
    expect(productTitle).toBeTruthy();
    await page.locator('select').selectOption('price-asc');
    await expect(page).toHaveURL(/sort=price-asc/);
    await expectNoHorizontalOverflow(page);

    await page.goto(productHref!, { waitUntil: 'domcontentloaded' });
    // WebKit can take longer to hydrate the PDP after the catalogue request.
    await expect(page.getByRole('heading', { name: productTitle!, exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('group', { name: 'Available sizes' }).getByRole('button').and(page.locator(':not([disabled])')).first().click();
    await page.getByRole('button', { name: 'Add To Cart', exact: true }).click();
    await expect(page.getByRole('dialog').getByText(productTitle!, { exact: true })).toBeVisible();
  });

  test('invalid customer login is handled inline', async ({ page }) => {
    await page.goto('/login?method=alternative', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('invalid-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Invalid email')).toBeVisible();
  });

  test('Admin Analytics authenticates and renders without overflow', async ({ page }) => {
    await page.goto(adminUrl + '/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    await expect(page.getByRole('heading', { name: 'Operations Overview', exact: true })).toBeVisible();
    await page.goto(adminUrl + '/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Net revenue', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
