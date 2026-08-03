import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Refresh token missing' }) });
  });
});

test('shows both auth tabs without WhatsApp OTP while it is disabled', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Continue with Phone OTP' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with WhatsApp OTP' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Email' })).toBeVisible();
  await page.getByRole('tab', { name: 'Create Account' }).click();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});
