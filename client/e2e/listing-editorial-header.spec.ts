import { expect, test } from '@playwright/test';

const listingPages = [
  { path: '/shop', title: 'Shop All' },
  { path: '/new-featured', title: 'New & Featured' },
  { path: '/men', title: 'Men' },
  { path: '/women', title: 'Women' },
  { path: '/sale', title: 'Sale' },
  { path: '/collections', title: 'Collections' },
  { path: '/collections/black-transit', title: 'Black Transit' },
  { path: '/category/men', title: 'Men' }
];

test.describe('Cruisin editorial listing headers', () => {
  test('gives every listing route a minimal editorial header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const listing of listingPages) {
      await page.goto(listing.path);
      const header = page.locator('#main').getByTestId('listing-editorial-header');
      await expect(header).toBeVisible();
      await expect(header.getByRole('heading', { level: 1 })).toHaveText(listing.title);
      await expect(header.getByText('Edition note', { exact: true })).toBeVisible();
      await expect(header).not.toContainText('Admin-managed Cruisin category page');
      await expect(header).not.toContainText('Folio');
      await expect(header).not.toContainText('pieces indexed');
      await expect(header).not.toContainText('visible /');
      await expect(header.locator('.listing-index-scan')).toHaveCSS('animation-name', 'listing-index-scan');
      await expect(header).not.toHaveAttribute('data-listing-code', /.+/);
      await expect.poll(async () => header.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(430);
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });

  test('keeps the minimal category header and controls composed on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/category/men');

    const header = page.locator('#main').getByTestId('listing-editorial-header');
    await expect(header).toBeVisible();
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Men');
    await expect(header).toContainText('The Men edit—considered proportions, everyday utility, and pieces built for repeat wear.');
    await expect(header).not.toContainText('Admin-managed');
    await expect(page.getByTestId('listing-toolbar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Advanced Filters' })).toBeVisible();
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
