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
  await expect(page.getByLabel('WhatsApp number')).toHaveAttribute('placeholder', 'xxxxx xxxxx');
  await page.getByRole('button', { name: 'Use email or Google' }).click();
  await expect(page.getByTestId('alternative-auth')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await page.getByRole('tab', { name: 'Create Account' }).click();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});

test('opens the complete mobile authentication flow as a bottom sheet without leaving the current page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/terms-and-condition');

  await page.getByRole('button', { name: 'Continue with WhatsApp' }).click();
  await expect(page).toHaveURL(/\/terms-and-condition$/);

  const overlay = page.getByTestId('mobile-auth-overlay');
  const sheet = page.getByTestId('auth-shell');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('mobile-auth-backdrop')).toHaveCSS('backdrop-filter', /blur/);
  await expect(page.getByLabel('WhatsApp number')).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/mobile-auth-open/);
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box ? Math.abs(box.y + box.height - 844) <= 1 : false;
  }).toBe(true);

  await page.getByRole('button', { name: 'Use email or Google' }).click();
  await expect(page.getByTestId('alternative-auth')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Create Account' })).toBeVisible();
  const closeButton = sheet.getByRole('button', { name: 'Close' });
  const tabs = page.getByRole('tablist', { name: 'Email authentication' });
  await expect.poll(async () => {
    const closeBox = await closeButton.boundingBox();
    const tabBox = await tabs.boundingBox();
    if (!closeBox || !tabBox) return false;
    return closeBox.y + closeBox.height <= tabBox.y;
  }).toBe(true);

  await page.getByTestId('mobile-auth-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(overlay).toBeHidden();
  await expect(page).toHaveURL(/\/terms-and-condition$/);
  await expect(page.locator('body')).not.toHaveClass(/mobile-auth-open/);
});

test('opens the same WhatsApp sheet when a logged-out shopper tries to use their wishlist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/terms-and-condition');

  await page.getByRole('button', { name: 'Wishlist' }).click();
  await expect(page.getByTestId('mobile-auth-overlay')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Save this piece' })).toHaveCount(0);
  await expect(page.getByLabel('WhatsApp number')).toBeFocused();
  await expect(page).toHaveURL(/\/terms-and-condition$/);
});

test('signs a fresh mobile shopper in through a mocked WhatsApp OTP and preserves the destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let verificationAttempts = 0;
  await page.route('**/api/v1/auth/otp/request', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { requestId: '665f6d8403bd2edc93800000', channel: 'whatsapp', cooldownSeconds: 60, expiresAt: new Date(Date.now() + 300_000).toISOString() }, message: 'OTP sent' })
    });
  });
  await page.route('**/api/v1/auth/otp/verify', async (route) => {
    verificationAttempts += 1;
    if (verificationAttempts === 1) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Invalid OTP' }) });
      return;
    }
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
  await page.getByRole('button', { name: 'Get OTP' }).click();
  const otpSheet = page.getByTestId('otp-bottom-sheet');
  const otpBackdrop = page.getByTestId('otp-mobile-backdrop');
  await expect(otpSheet).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Enter OTP' })).toBeVisible();
  await expect(otpSheet).toHaveCSS('border-top-left-radius', '32px');
  await expect(otpBackdrop).toHaveCSS('backdrop-filter', /blur/);
  await expect(page.locator('body')).toHaveClass(/mobile-otp-open/);
  await expect(page.locator('#main')).toHaveCSS('z-index', '160');
  await expect.poll(async () => {
    const box = await otpSheet.boundingBox();
    return box ? Math.abs(box.y + box.height - 844) <= 1 : false;
  }).toBe(true);
  await expect.poll(async () => page.evaluate(() => Boolean(document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 20)?.closest('[data-testid="otp-bottom-sheet"]')))).toBe(true);
  await expect.poll(async () => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  const otpInput = page.getByLabel('Verification code');
  await expect(otpInput).toBeFocused();
  await expect(otpInput).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.getByTestId('otp-code-input').locator('span')).toHaveCount(6);
  await otpInput.fill('111111');
  await expect(page.getByText('Incorrect OTP. Please try again.')).toBeVisible();
  await otpInput.fill('123456');
  await expect(page).toHaveURL(/\/shop$/);
});
