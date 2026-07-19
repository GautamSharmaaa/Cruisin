import { expect, test } from '@playwright/test';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

const expectNoHorizontalOverflow = async (page: import('@playwright/test').Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

test.describe('supported cross-browser smoke contract', () => {
  test('homepage, menu, catalogue, and PDP interactions work', async ({ page, isMobile }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Cruisin Current Catalogue' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: isMobile ? 'Menu' : 'Cruisin menu' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    await page.goto('/shop');
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
    await page.locator('select').selectOption('price-asc');
    await expect(page).toHaveURL(/sort=price-asc/);
    await expectNoHorizontalOverflow(page);

    await page.goto('/product/void-drape-hoodie');
    await expect(page.getByRole('heading', { name: 'Void Drape Hoodie' })).toBeVisible();
    await page.getByRole('group', { name: 'Available sizes' }).getByRole('button', { name: 'Size S', exact: true }).click();
    await page.getByRole('button', { name: 'Add To Cart', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('Void Drape Hoodie')).toBeVisible();
  });

  test('invalid customer login is handled inline', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('invalid-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Invalid email')).toBeVisible();
  });

  test('Admin Analytics authenticates and renders without overflow', async ({ page }) => {
    await page.goto(adminUrl + '/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    await expect(page.getByRole('heading', { name: 'Operations Overview', exact: true })).toBeVisible();
    await page.goto(adminUrl + '/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Net revenue', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
