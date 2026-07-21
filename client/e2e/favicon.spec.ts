import { expect, test } from '@playwright/test';

test('publishes the Cruisin browser and Apple icons', async ({ page }) => {
  await page.goto('/');

  const browserIcon = page.locator('link[rel="icon"]');
  const appleIcon = page.locator('link[rel="apple-touch-icon"]');

  await expect(browserIcon).toHaveAttribute('type', 'image/png');
  await expect(browserIcon).toHaveAttribute('sizes', '512x512');
  await expect(appleIcon).toHaveAttribute('type', 'image/png');
  await expect(appleIcon).toHaveAttribute('sizes', '180x180');

  for (const icon of [browserIcon, appleIcon]) {
    const href = await icon.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.request.get(new URL(href!, page.url()).toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});
