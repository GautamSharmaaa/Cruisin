import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Refresh token missing' }) });
  });
});

test('shows both auth tabs and all login methods', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Continue with Phone OTP' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with WhatsApp OTP' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Email' })).toBeVisible();
  await page.getByRole('tab', { name: 'Create Account' }).click();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});

test('shows explicit WhatsApp OTP delivery state', async ({ page }) => {
  await page.route('**/api/v1/auth/otp/request', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'OTP sent', data: { requestId: '665f6d8403bd2edc93800000', channel: 'whatsapp', cooldownSeconds: 60, expiresAt: new Date(Date.now() + 300000).toISOString() } })
    });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with WhatsApp OTP' }).click();
  await page.getByLabel('Country code').fill('+91');
  await page.getByLabel('WhatsApp number').fill('9876543210');
  await page.getByRole('button', { name: 'Send OTP on WhatsApp' }).click();
  await expect(page.getByText('OTP sent on WhatsApp. It expires in 5 minutes.')).toBeVisible();
  await expect(page.getByLabel('Verification code')).toBeVisible();
});
