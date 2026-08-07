import { expect, test } from '@playwright/test';

test('hides the mobile navigation while exploring and reveals it on a small downward touch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/terms-and-condition');

  const navigation = page.locator('nav[aria-label="Mobile navigation"]');
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveAttribute('data-scroll-state', 'visible');

  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(navigation).toHaveAttribute('data-scroll-state', 'hidden');
  await expect(navigation).toHaveCSS('opacity', '0');
  await expect(navigation).toHaveCSS('pointer-events', 'none');

  await page.evaluate(() => {
    const touchEvent = (type: 'touchstart' | 'touchmove', clientY: number): Event => {
      const event = new Event(type);
      Object.defineProperty(event, 'touches', { value: [{ clientY }] });
      return event;
    };
    window.dispatchEvent(touchEvent('touchstart', 300));
    window.dispatchEvent(touchEvent('touchmove', 304));
  });

  await expect(navigation).toHaveAttribute('data-scroll-state', 'visible');
  await expect(navigation).toHaveCSS('opacity', '1');

  await page.evaluate(() => window.scrollBy(0, 80));
  await expect(navigation).toHaveAttribute('data-scroll-state', 'hidden');
  await page.evaluate(() => window.scrollBy(0, -4));
  await expect(navigation).toHaveAttribute('data-scroll-state', 'visible');
});
