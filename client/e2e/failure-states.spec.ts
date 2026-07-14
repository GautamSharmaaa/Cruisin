import { expect, test } from '@playwright/test';

test.describe('customer-facing failure states', () => {
  test('unknown routes render the branded 404 recovery action', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-qa');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back Home' })).toHaveAttribute('href', '/');
  });

  test('a product API outage renders a retryable error instead of an empty catalogue', async ({ page }) => {
    await page.route('**/api/v1/products?**', (route) => route.abort('failed'));
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: "We couldn't load the collection" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('broken product media falls back to a local branded asset', async ({ page }) => {
    await page.route('**/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1517462964-21fdcec3f25b**', (route) => route.abort('failed'));
    await page.goto('/product/cyber-cargo-pants');
    const image = page.getByAltText('Cyber Cargo Pants - Sage Green Front').first();
    await expect(image).toHaveAttribute('src', /\/cruisin-image-fallback\.svg$/);
  });
});
