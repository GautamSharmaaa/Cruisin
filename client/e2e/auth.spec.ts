import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Refresh token missing' }) });
  });
});

test('makes WhatsApp OTP primary while keeping email and Google available', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('whatsapp-primary-auth')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Continue with WhatsApp' })).toBeVisible();
  await expect(page.getByLabel('WhatsApp number')).toBeFocused();
  await page.getByRole('button', { name: 'Use email or Google' }).click();
  await expect(page.getByTestId('alternative-auth')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByRole('tab', { name: 'Create Account' }).click();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});

test('signs a fresh mobile shopper in through a mocked WhatsApp OTP and preserves the destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/auth/otp/request', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { requestId: '665f6d8403bd2edc93800000', channel: 'whatsapp', cooldownSeconds: 60, expiresAt: new Date(Date.now() + 300_000).toISOString() }, message: 'OTP sent' })
    });
  });
  await page.route('**/api/v1/auth/otp/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { user: { id: '665f6d8403bd2edc93800001', name: 'Cruisin Member', email: '919876543210@phone.cruisin.local', role: 'customer', phone: '+919876543210', whatsappNumber: '+919876543210', isVerified: true, profileIncomplete: true }, accessToken: 'test-access-token' }, message: 'OTP verified' })
    });
  });
  await page.route('**/api/v1/cart/merge', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {}, message: 'Cart merged' }) });
  });
  await page.route('**/api/v1/wishlist', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { products: [] }, message: 'Wishlist loaded' }) });
  });

  await page.goto('/login?redirect=%2Fshop');
  await page.getByLabel('WhatsApp number').fill('9876543210');
  await page.getByRole('button', { name: 'Send code on WhatsApp' }).click();
  await expect(page.getByLabel('Verification code')).toBeFocused();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
});
