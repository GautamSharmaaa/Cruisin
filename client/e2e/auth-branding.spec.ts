import { expect, test } from '@playwright/test';

test.describe('authentication brand artwork', () => {
  test('shows the supplied monogram beside both sign-in and sign-up forms on desktop', async ({ page }) => {
    const googleWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('[GSI_LOGGER]')) googleWarnings.push(message.text());
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login');

    const artwork = page.getByTestId('auth-brand-artwork');
    const imageStage = page.getByTestId('auth-brand-image-stage');
    const panel = page.getByTestId('auth-brand-panel');
    const wordmark = page.getByTestId('auth-brand-wordmark');
    const label = page.getByTestId('auth-brand-label');
    await expect(artwork).toBeVisible();
    await expect(imageStage).toBeVisible();
    await expect(wordmark).toHaveText('Cruisin');
    await expect(label).toHaveText('Ultra premium streetwear');
    await expect(wordmark).toHaveClass(/brand-wordmark-script/);
    await expect(wordmark).toHaveCSS('font-family', /Snell Roundhand/);
    await expect(wordmark).toHaveCSS('animation-name', 'auth-wordmark-sweep');
    const wordmarkBox = await wordmark.boundingBox();
    const labelBox = await label.boundingBox();
    expect(wordmarkBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    expect(wordmarkBox!.x).toBeLessThan(labelBox!.x);
    expect(labelBox!.y).toBeGreaterThan(wordmarkBox!.y + wordmarkBox!.height);
    await expect(artwork.locator('img')).toHaveCount(1);
    await expect(artwork.locator('img')).toHaveAttribute('src', /cruisin-auth-monogram\.webp/);
    const panelBox = await panel.boundingBox();
    const artworkBox = await artwork.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(artworkBox).toEqual(panelBox);
    await expect(page.getByTestId('whatsapp-primary-auth')).toBeVisible();
    await page.getByRole('button', { name: 'Use email or Google' }).click();
    const googleFrame = page.getByTestId('google-auth-frame');
    const googleFallback = page.getByRole('button', { name: 'Continue with Google' });
    const emailButton = page.getByTestId('alternative-auth').locator('form button[type="submit"]');
    const googleMethod = await googleFrame.count() ? googleFrame : googleFallback;
    await expect(googleMethod).toBeVisible();
    if (await googleFrame.count()) {
      await expect(googleFrame).toHaveCSS('background-color', 'rgb(32, 33, 36)');
    } else {
      await expect(googleFallback).toBeDisabled();
    }
    await expect.poll(async () => {
      const googleBox = await googleMethod.boundingBox();
      const emailBox = await emailButton.boundingBox();
      return Boolean(googleBox && emailBox && Math.abs(googleBox.width - emailBox.width) <= 1);
    }).toBe(true);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveClass(/sr-only/);
    const signInImageBox = await imageStage.boundingBox();

    await page.getByRole('tab', { name: 'Create Account' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toHaveClass(/sr-only/);
    await expect(artwork).toBeVisible();
    expect(await imageStage.boundingBox()).toEqual(signInImageBox);
    expect(googleWarnings).toEqual([]);
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('keeps the artwork out of the compact mobile form layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    const header = page.locator('header');
    const authShell = page.getByTestId('auth-shell');
    await expect(page.getByTestId('auth-brand-artwork')).toBeHidden();
    await expect(page.getByTestId('whatsapp-primary-auth')).toBeVisible();
    await page.getByRole('button', { name: 'Use email or Google' }).click();
    const googleFrame = page.getByTestId('google-auth-frame');
    const googleFallback = page.getByRole('button', { name: 'Continue with Google' });
    await expect(await googleFrame.count() ? googleFrame : googleFallback).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveClass(/sr-only/);
    await expect.poll(async () => {
      const headerBox = await header.boundingBox();
      const shellBox = await authShell.boundingBox();
      return headerBox && shellBox ? Math.round(shellBox.y - (headerBox.y + headerBox.height)) : null;
    }).toBe(0);

    await page.getByRole('tab', { name: 'Create Account' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toHaveClass(/sr-only/);
    await expect.poll(async () => {
      const headerBox = await header.boundingBox();
      const shellBox = await authShell.boundingBox();
      return headerBox && shellBox ? Math.round(shellBox.y - (headerBox.y + headerBox.height)) : null;
    }).toBe(0);
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
