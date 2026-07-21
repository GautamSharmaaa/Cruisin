import { expect, test } from '@playwright/test';

test.describe('animated header tagline', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('runs a restrained Cruisin tagline sweep on desktop', async ({ page }) => {
    await page.goto('/');

    const tagline = page.getByTestId('animated-brand-tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveText('Wear Less. Mean More.');
    await expect(tagline).toHaveCSS('animation-name', 'brand-tagline-sweep');
    await expect(tagline).toHaveCSS('animation-duration', '5.4s');
    await expect(tagline).toHaveCSS('background-image', /linear-gradient/);
  });

  test('keeps the tagline static when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const tagline = page.getByTestId('animated-brand-tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveCSS('animation-name', 'none');
    await expect(tagline).toHaveCSS('-webkit-text-fill-color', 'rgb(125, 125, 125)');
  });
});
