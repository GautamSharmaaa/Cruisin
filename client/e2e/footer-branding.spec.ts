import { expect, test } from '@playwright/test';

test.describe('footer branding', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    test(`uses the cursive Cruisin wordmark on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      const wordmark = page.getByTestId('footer-wordmark');
      await wordmark.scrollIntoViewIfNeeded();
      await expect(wordmark).toBeVisible();
      await expect(wordmark).toHaveText('Cruisin');
      await expect(wordmark).toHaveClass(/brand-wordmark-script/);
      await expect(wordmark).toHaveCSS('font-family', /Snell Roundhand/);
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
});
