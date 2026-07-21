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

  test('keeps the animated tote in the header without duplicating it in bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    const headerWordmark = page.locator('header').getByRole('link', { name: 'Cruisin', exact: true });
    await expect(headerWordmark).toHaveClass(/brand-wordmark-script/);
    await expect(headerWordmark).toHaveCSS('font-family', /Snell Roundhand/);

    const menuButton = page.locator('header').getByRole('button', { name: 'Menu' });
    const menuMark = menuButton.getByTestId('sleek-menu-mark');
    await expect(menuMark).toBeVisible();
    await expect(menuMark.locator('[data-menu-line]')).toHaveCount(3);
    await expect.poll(async () => menuMark.locator('[data-menu-line]').evaluateAll((lines) => lines.map((line) => Math.round(line.getBoundingClientRect().width)))).toEqual([28, 20, 12]);

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const mobileMenu = page.getByRole('dialog', { name: 'Menu' });
    await expect(mobileMenu).toBeVisible();
    const mobileMenuWordmark = mobileMenu.getByTestId('mobile-menu-wordmark');
    await expect(mobileMenuWordmark).toBeVisible();
    await expect(mobileMenuWordmark).toHaveText('Cruisin');
    await expect(mobileMenuWordmark).toHaveClass(/brand-wordmark-script/);
    await expect(mobileMenuWordmark).toHaveCSS('font-family', /Snell Roundhand/);
    await mobileMenu.getByRole('button', { name: 'Close' }).click();
    await expect(mobileMenu).toBeHidden();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    const headerCart = page.locator('header').getByRole('button', { name: 'Cart' });
    const headerBag = headerCart.locator('[data-revolving-bag="icon"]');
    await expect(headerBag).toBeVisible();
    await expect(headerBag.locator('.empty-bag-rotator')).toHaveCSS('animation-name', 'empty-bag-icon-rotate');

    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    const mobileShop = mobileNavigation.getByRole('link', { name: 'Shop All' });
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileShop.locator('[data-revolving-bag="icon"]')).toHaveCount(0);
    const shopAllMark = mobileShop.locator('[data-shop-all-mark]');
    await expect(shopAllMark).toBeVisible();
    await expect(shopAllMark).toHaveAttribute('class', /lucide-store/);
    await expect(mobileShop).not.toContainText('All');
    await expect(mobileShop).toHaveAttribute('href', '/shop');

    await headerCart.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Bag', { exact: true })).toBeVisible();
  });
});
