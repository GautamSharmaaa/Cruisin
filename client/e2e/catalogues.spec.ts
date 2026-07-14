import { expect, type Page, test } from '@playwright/test';
import path from 'node:path';

const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';
const realCataloguePath = path.resolve(process.cwd(), '../test-fixtures/catalogues/real-cruisin-catalogue.csv');

const attachDiagnostics = (page: Page): { errors: string[]; failed: string[] } => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && (url.includes('/api/') || url.startsWith(adminUrl))) failed.push(url + ' :: HTTP ' + response.status());
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('.hot-update.') || request.failure()?.errorText === 'net::ERR_ABORTED') return;
    if (url.includes('/api/') || url.startsWith(adminUrl)) failed.push(url + ' :: ' + (request.failure()?.errorText ?? 'failed'));
  });
  return { errors, failed };
};

const loginAdmin = async (page: Page): Promise<void> => {
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
};

test.describe('admin catalogues', () => {
  test('loads, previews real CSV, dry-runs, exports, and has no layout overflow', async ({ page, isMobile }) => {
    test.skip(isMobile, 'real CSV upload/export flow is covered by the desktop project');
    const diagnostics = attachDiagnostics(page);
    await loginAdmin(page);
    await page.goto(adminUrl + '/catalogues');
    await expect(page.getByRole('heading', { name: 'Catalogues', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Catalogues/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dry Run' }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Import' })).toBeDisabled();
    await expect(page.getByText('Import History')).toBeVisible();
    await expect(page.getByText('Export History')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(realCataloguePath);
    await expect(page.getByText('real-cruisin-catalogue.csv').first()).toBeVisible();
    await page.getByRole('button', { name: 'Upload Preview' }).click();
    await expect(page.getByText('Catalogue preview is ready.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('235', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('44', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Dark Grey Polyester Slim Tapered Fit Bottomwear Joggers For Men').first()).toBeVisible();
    await expect(page.getByText('Men > Clothing > Track Pants & Joggers').first()).toBeVisible();

    await page.getByRole('button', { name: 'Dry Run' }).nth(1).click();
    await expect(page.getByText('Dry run completed.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Dry run ready')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Import' })).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cruisin_catalogue_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/);
    await expect(page.getByText('Catalogue export generated.')).toBeVisible({ timeout: 15000 });

    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(diagnostics.errors.filter((entry) => !entry.includes('favicon'))).toEqual([]);
    expect(diagnostics.failed).toEqual([]);
  });

  for (const width of [390, 768]) {
    test('catalogues page is responsive at ' + width + 'px', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginAdmin(page);
      await page.goto(adminUrl + '/catalogues');
      await expect(page.getByRole('heading', { name: 'Catalogues', exact: true })).toBeVisible();
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
});
