import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';
const customerEmail = process.env.PLAYWRIGHT_CUSTOMER_EMAIL;
const customerPassword = process.env.PLAYWRIGHT_CUSTOMER_PASSWORD;

const closeStorefrontOverlays = async (page: Page): Promise<void> => {
  const close = page.locator('button[aria-label="Close popup"]');
  if (await close.isVisible().catch(() => false)) await close.click();
};

const expectNoSeriousAccessibilityViolations = async (page: Page): Promise<void> => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
  expect(violations, violations.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`).join('\n')).toEqual([]);
};

test.describe('automated accessibility smoke gate', () => {
  for (const route of ['/', '/shop', '/product/void-drape-hoodie', '/login']) {
    test(`storefront ${route} has no serious WCAG A/AA violations`, async ({ page }) => {
      await page.goto(storefrontUrl + route);
      await closeStorefrontOverlays(page);
      await expect(page.locator('main').last()).toBeVisible();
      await expectNoSeriousAccessibilityViolations(page);
    });
  }

  test('Admin Analytics has no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto(adminUrl + '/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    await page.goto(adminUrl + '/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });

  test('authenticated mobile account hub has no serious WCAG A/AA violations', async ({ page }) => {
    test.skip(!customerEmail || !customerPassword, 'Customer QA credentials were not provided');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(storefrontUrl + '/login?method=alternative');
    await page.getByLabel('Email').fill(customerEmail!);
    await page.getByLabel('Password').fill(customerPassword!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(storefrontUrl + '/account');
    await expect(page.getByRole('heading', { name: 'My Cruisin' })).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
