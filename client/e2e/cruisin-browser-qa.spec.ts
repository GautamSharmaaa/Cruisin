import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';
const imageUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';
const videoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

type CreatedRecords = { categoryId?: string; collectionId?: string; productId?: string; token: string; slug: string };

const attachPageDiagnostics = (page: Page): { errors: string[]; failed: string[] } => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.includes('/_next/') || url.startsWith(storefrontUrl) || url.startsWith(adminUrl)) {
      failed.push(url + ' :: ' + (request.failure()?.errorText ?? 'failed'));
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() < 400 || url.includes('.hot-update.')) return;
    if (url.includes('/api/') || url.startsWith(storefrontUrl) || url.startsWith(adminUrl)) failed.push(url + ' :: HTTP ' + response.status());
  });
  return { errors, failed };
};

const expectNoImportantBrowserFailures = (diagnostics: { errors: string[]; failed: string[] }): void => {
  expect(diagnostics.errors.filter((entry) => !entry.includes('favicon'))).toEqual([]);
  expect(diagnostics.failed.filter((entry) => !entry.includes('.hot-update.') && !entry.includes('net::ERR_ABORTED'))).toEqual([]);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const loginToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(apiUrl + '/auth/login', { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.accessToken as string;
};

const adminHeaders = (token: string): Record<string, string> => ({ Authorization: 'Bearer ' + token });

const createBrowserTestRecords = async (request: APIRequestContext): Promise<CreatedRecords> => {
  const token = await loginToken(request);
  const slug = 'browser-test-' + Date.now();
  const category = await request.post(apiUrl + '/admin/categories', {
    headers: adminHeaders(token),
    data: {
      name: 'Browser Test Category',
      slug,
      image: imageUrl,
      description: 'Temporary browser QA category.',
      heroTitle: 'Browser Test Category',
      heroSubtitle: 'Admin controlled browser QA category.',
      heroImage: imageUrl,
      mobileHeroImage: imageUrl,
      categoryVideo: videoUrl,
      videoPosterImage: imageUrl,
      imageAltText: 'Browser test category',
      isActive: true,
      isVisible: true,
      isPublished: true,
      showInHeader: false,
      showInMenu: false,
      showInFilters: true,
      sortOrder: 999,
      defaultSort: 'newest',
      defaultGridView: 4,
      areFiltersVisible: true,
      isAdvancedFilterEnabled: true,
      isFlashlightEnabled: true,
      seoTitle: 'Browser Test Category | Cruisin',
      seoDescription: 'Temporary browser QA category.',
      ogImage: imageUrl
    }
  });
  expect(category.ok()).toBeTruthy();
  const categoryBody = await category.json();
  const categoryId = categoryBody.data._id as string;

  const collection = await request.post(apiUrl + '/admin/collections', {
    headers: adminHeaders(token),
    data: {
      title: 'Browser Test Collection',
      slug,
      description: 'Temporary browser QA collection.',
      heroTitle: 'Browser Test Collection',
      heroSubtitle: 'Admin controlled browser QA collection.',
      heroImage: imageUrl,
      mobileHeroImage: imageUrl,
      cardImage: imageUrl,
      thumbnailImage: imageUrl,
      bannerImage: imageUrl,
      mobileImage: imageUrl,
      collectionVideo: videoUrl,
      videoPosterImage: imageUrl,
      imageAltText: 'Browser test collection',
      productIds: [],
      categoryIds: [categoryId],
      tags: ['browser-test'],
      sortOrder: 999,
      isVisible: true,
      isPublished: true,
      isFeatured: false,
      showInMenu: true,
      menuCardImage: imageUrl,
      mobileMenuCardImage: imageUrl,
      defaultSort: 'newest',
      defaultGridView: 4,
      areFiltersVisible: true,
      isAdvancedFilterEnabled: true,
      isFlashlightEnabled: true,
      seoTitle: 'Browser Test Collection | Cruisin',
      seoDescription: 'Temporary browser QA collection.',
      ogImage: imageUrl
    }
  });
  expect(collection.ok()).toBeTruthy();
  const collectionBody = await collection.json();
  const collectionId = collectionBody.data._id as string;

  const product = await request.post(apiUrl + '/products', {
    headers: adminHeaders(token),
    data: {
      title: 'Browser Test Product',
      slug,
      description: 'Temporary browser QA product with enough description.',
      shortDescription: 'Browser QA product.',
      richDescription: 'Temporary browser QA product created by Playwright and cleaned up after verification.',
      brand: 'Cruisin',
      category: categoryId,
      categoryIds: [categoryId],
      collections: [collectionId],
      collectionSlugs: [slug],
      images: [{ url: imageUrl, alt: 'Browser Test Product', width: 1200, height: 1600 }],
      hoverImage: { url: imageUrl, alt: 'Browser Test Product hover', width: 1200, height: 1600 },
      videoUrl,
      mobileVideoUrl: videoUrl,
      videoPosterImage: imageUrl,
      imageAltText: 'Browser Test Product',
      basePrice: 1999,
      comparePrice: 2499,
      variants: [{ size: 'M', color: 'Black', colorHex: '#000000', sku: 'BT-' + slug.toUpperCase(), price: 1999, stock: 5, enabled: true, images: [{ url: imageUrl, alt: 'Browser Test Product', width: 1200, height: 1600 }] }],
      tags: ['browser-test'],
      gender: 'unisex',
      status: 'published',
      visibility: 'visible',
      isSale: true,
      isFeatured: true,
      isBestseller: false,
      isNewArrival: true,
      isLatestDrop: true,
      isActive: true,
      isArchived: false,
      materialCare: 'Machine wash cold.',
      fitDetails: 'Relaxed fit.',
      shippingReturns: 'Ships for QA only.',
      sizeGuide: 'M',
      productHighlights: ['Admin image', 'Admin video'],
      sortOrder: 999,
      relatedProducts: [],
      recommendedProducts: [],
      seo: { metaTitle: 'Browser Test Product | Cruisin', metaDesc: 'Temporary browser QA product.', ogImage: imageUrl }
    }
  });
  expect(product.ok()).toBeTruthy();
  const productBody = await product.json();
  return { token, slug, categoryId, collectionId, productId: productBody.data._id as string };
};

const cleanupBrowserTestRecords = async (request: APIRequestContext, records?: CreatedRecords): Promise<void> => {
  if (!records) return;
  const headers = adminHeaders(records.token);
  if (records.productId) await request.delete(apiUrl + '/products/' + records.productId, { headers }).catch(() => undefined);
  if (records.collectionId) await request.delete(apiUrl + '/admin/collections/' + records.collectionId, { headers }).catch(() => undefined);
  if (records.categoryId) await request.delete(apiUrl + '/admin/categories/' + records.categoryId, { headers }).catch(() => undefined);
};

test.describe('storefront browser QA', () => {
  test('homepage/header and desktop menu overlay work without browser errors', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop menu overlay is covered by the desktop project');
    const diagnostics = attachPageDiagnostics(page);
    await page.goto(storefrontUrl + '/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.getByRole('link', { name: 'Cruisin Wear Less. Mean More.' })).toBeVisible();
    const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
    for (const label of ['New & Featured', 'Men', 'Women', 'Sale', 'Collections']) {
      await expect(primaryNav.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(primaryNav.getByRole('button', { name: 'Shop', exact: true })).toHaveCount(0);
    await expect(page.getByText('Jordan')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const desktopDialog = page.getByRole('dialog', { name: 'Cruisin menu' });
    const menuSections = desktopDialog.getByRole('navigation', { name: 'Menu sections' });
    await expect(desktopDialog).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await expect(menuSections.getByRole('button', { name: 'Collections', exact: true })).toBeVisible();
    await menuSections.getByRole('button', { name: 'Collections', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Quiet Uniform' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View All Collections' })).toBeVisible();
    await menuSections.getByRole('button', { name: 'Men', exact: true }).click();
    await expect(page.getByRole('link', { name: 'T-Shirts', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quiet Uniform' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Cruisin menu' })).toHaveCount(0);
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('mobile menu drawer works at phone/tablet width', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile drawer is covered by the mobile project');
    const diagnostics = attachPageDiagnostics(page);
    await page.goto(storefrontUrl + '/');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const mobileDialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(mobileDialog).toBeVisible();
    for (const label of ['New & Featured', 'Men', 'Women', 'Sale', 'Collections']) {
      await expect(mobileDialog.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await mobileDialog.getByRole('button', { name: 'Collections', exact: true }).click();
    await expect(page.getByRole('link', { name: 'View All Collections' })).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('category, collection, listing controls, and product detail pages load', async ({ page }) => {
    const diagnostics = attachPageDiagnostics(page);
    for (const path of ['/men', '/women', '/sale', '/new-featured', '/category/men', '/category/men/t-shirts', '/collections']) {
      await page.goto(storefrontUrl + path);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.locator('main')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    await page.goto(storefrontUrl + '/shop');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.getByRole('button', { name: '2-grid' }).click();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('cruisin_grid_view'))).toBe('2');
    await page.getByRole('button', { name: 'Toggle spotlight mode' }).click();
    await expect(page.getByRole('button', { name: 'Toggle spotlight mode' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('select').selectOption('price-asc');
    await expect(page).toHaveURL(/sort=price-asc/);
    const firstProduct = page.locator('a[href="/product/minimalist-heavyweight-tee"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('main h1')).toBeVisible();
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeVisible();
    expectNoImportantBrowserFailures(diagnostics);
  });

  for (const width of [360, 390, 430, 768, 1024]) {
    test('responsive storefront smoke at ' + width + 'px', async ({ page }) => {
      const diagnostics = attachPageDiagnostics(page);
      await page.setViewportSize({ width, height: width < 768 ? 900 : 960 });
      await page.goto(storefrontUrl + '/');
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.locator('header')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.goto(storefrontUrl + '/shop');
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expectNoImportantBrowserFailures(diagnostics);
    });
  }
});

test.describe('admin and admin-to-storefront browser QA', () => {
  test('admin login and key managers load', async ({ page, isMobile }) => {
    test.skip(isMobile, 'admin desktop manager QA is covered by the desktop project');
    const diagnostics = attachPageDiagnostics(page);
    await page.goto(adminUrl + '/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    for (const path of ['/storefront', '/categories', '/products']) {
      await page.goto(adminUrl + path);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.locator('main')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    expectNoImportantBrowserFailures(diagnostics);
  });

  test('temporary admin data reflects on storefront and cleans up', async ({ page, request, isMobile }) => {
    test.skip(isMobile, 'admin-to-storefront data reflection is covered by the desktop project');
    let records: CreatedRecords | undefined;
    try {
      records = await createBrowserTestRecords(request);
      await page.goto(storefrontUrl + '/category/' + records.slug);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.getByRole('heading', { name: 'Browser Test Category' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browser Test Product' })).toBeVisible();

      await page.goto(storefrontUrl + '/collections/' + records.slug);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.getByRole('heading', { name: 'Browser Test Collection' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browser Test Product' })).toBeVisible();

      await page.goto(storefrontUrl + '/product/' + records.slug);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.getByRole('heading', { name: 'Browser Test Product' })).toBeVisible();
      await expect(page.getByText('Admin image')).toBeVisible();
      await expect(page.locator('video:visible').first()).toBeVisible();
    } finally {
      await cleanupBrowserTestRecords(request, records);
    }
  });
});
