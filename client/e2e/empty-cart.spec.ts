import { expect, test } from '@playwright/test';

test.describe('empty cart presentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.removeItem('cruisin-cart'));
    await page.goto('/cart');
  });

  test('renders the animated Cruisin shopping tote without mobile overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Your Bag Is Quiet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute('href', '/shop');

    const bag = page.locator('[data-revolving-bag="display"]');
    await expect(bag).toBeVisible();
    await expect(bag.locator('.empty-bag-wordmark')).toHaveCount(2);
    await expect(bag.locator('.empty-bag-wordmark')).toHaveText(['Cruisin', 'Cruisin']);
    await expect(bag.locator('.empty-bag-handle')).toHaveCount(2);
    await expect(bag.locator('.empty-bag-side')).toHaveCount(2);

    const rotator = bag.locator('.empty-bag-rotator');
    await expect(rotator).toHaveCSS('animation-name', 'empty-bag-rotate');
    await expect(rotator).toHaveCSS('animation-play-state', 'running');

    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('uses the same compact commerce header as checkout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.getByRole('link', { name: '← Shop' })).toHaveAttribute('href', '/shop');
    await expect(page.getByRole('link', { name: 'Cruisin', exact: true })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Secure' })).toHaveAttribute('href', '/checkout');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  });
});
