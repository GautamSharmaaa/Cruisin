import { expect, type APIRequestContext, type Page, test } from '@playwright/test';

const storefrontUrl = process.env.PLAYWRIGHT_STOREFRONT_URL ?? 'http://localhost:3000';
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://localhost:3001';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

type Records = {
  token: string;
  slug: string;
  navLabel: string;
  collectionTitle: string;
  tagName: string;
  pageTitle: string;
  navId: string;
  collectionId: string;
  tagId: string;
  pageId: string;
  columnId: string;
  linkId: string;
  cardId: string;
  promoId: string;
};

type UiCrudRecords = {
  token: string;
  navId?: string;
  navSlug?: string;
  collectionId?: string;
  collectionSlug?: string;
  tagId?: string;
  tagSlug?: string;
  pageId?: string;
  pageSlug?: string;
};

const headers = (token: string): Record<string, string> => ({ Authorization: 'Bearer ' + token });

const loginToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(apiUrl + '/auth/login', { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.accessToken as string;
};

const adminLogin = async (page: Page): Promise<void> => {
  await page.goto(adminUrl + '/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page).toHaveURL(adminUrl + '/');
};

const clickManagerTab = async (page: Page, label: string): Promise<void> => {
  await page.locator('section.grid.gap-5 > div:first-child button').filter({ hasText: label }).click();
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const rowByText = (page: Page, text: string) => page.locator('tbody tr').filter({ hasText: text });

const expectOneRow = async (page: Page, text: string) => {
  const row = rowByText(page, text);
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  return row;
};

const adminNavigationBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; label: string; slug: string; columns: Array<{ _id: string; title: string; links: Array<{ _id: string; label: string; href: string }> }>; collectionCards: Array<{ _id: string }>; promo?: { _id: string; title?: string } | null } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/navigation', { headers: headers(token) })).json();
  return body.data.find((item: { slug: string }) => item.slug === slug);
};

const adminCollectionBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; title: string; slug: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/collections', { headers: headers(token) })).json();
  return body.data.find((item: { slug: string }) => item.slug === slug);
};

const adminTagBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; name: string; slug: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/tags', { headers: headers(token) })).json();
  return body.data.find((item: { slug: string }) => item.slug === slug);
};

const adminPageBySlug = async (request: APIRequestContext, token: string, slug: string): Promise<{ _id: string; title: string; pageSlug: string } | undefined> => {
  const body = await (await request.get(apiUrl + '/admin/page-settings', { headers: headers(token), params: { limit: 100 } })).json();
  return body.data.items.find((item: { pageSlug: string }) => item.pageSlug === slug);
};

const createRecords = async (request: APIRequestContext): Promise<Records> => {
  const token = await loginToken(request);
  const slug = 'visibility-qa-' + Date.now();
  const navLabel = 'Visibility QA Nav ' + slug;
  const collectionTitle = 'Visibility QA Collection ' + slug;
  const tagName = 'Visibility QA Tag ' + slug;
  const pageTitle = 'Visibility QA Page ' + slug;
  const authHeaders = headers(token);

  const collection = await request.post(apiUrl + '/admin/collections', {
    headers: authHeaders,
    data: { title: collectionTitle, slug, sortOrder: 899, isVisible: true, isPublished: true, showInMenu: true }
  });
  expect(collection.ok()).toBeTruthy();
  const collectionId = (await collection.json()).data._id as string;

  const nav = await request.post(apiUrl + '/admin/navigation', {
    headers: authHeaders,
    data: { label: navLabel, slug, href: '/' + slug, type: 'mega_menu', menuLayoutType: 'text-columns', sortOrder: 899, isVisible: true, isMegaMenuEnabled: true, isDefaultActive: false }
  });
  expect(nav.ok()).toBeTruthy();
  const navId = (await nav.json()).data._id as string;

  const column = await request.post(apiUrl + '/admin/mega-menu/columns', {
    headers: authHeaders,
    data: { navItemId: navId, title: 'Visibility QA Column', sortOrder: 0, isVisible: true }
  });
  expect(column.ok()).toBeTruthy();
  const columnId = (await column.json()).data._id as string;

  const link = await request.post(apiUrl + '/admin/mega-menu/links', {
    headers: authHeaders,
    data: { columnId, label: 'Visibility QA Link', href: '/' + slug + '/link', linkedType: 'custom_url', linkedId: null, sortOrder: 0, isVisible: true, isHighlighted: false, showArrow: false }
  });
  expect(link.ok()).toBeTruthy();
  const linkId = (await link.json()).data._id as string;

  const card = await request.post(apiUrl + '/admin/mega-menu/collection-cards', {
    headers: authHeaders,
    data: { navItemId: navId, collectionId, sortOrder: 0, isVisible: true }
  });
  expect(card.ok()).toBeTruthy();
  const cardId = (await card.json()).data._id as string;

  const promo = await request.post(apiUrl + '/admin/mega-menu/promos', {
    headers: authHeaders,
    data: { navItemId: navId, eyebrow: 'Visibility QA', title: 'Visibility QA Promo', subtitle: 'Temporary promo.', buttonLabel: 'Shop QA', buttonHref: '/' + slug, overlayOpacity: 0.5, showOnDesktop: true, showOnMobile: true, isVisible: true }
  });
  expect(promo.ok()).toBeTruthy();
  const promoId = (await promo.json()).data._id as string;

  const tag = await request.post(apiUrl + '/admin/tags', {
    headers: authHeaders,
    data: { name: tagName, slug, sortOrder: 899, isVisible: true }
  });
  expect(tag.ok()).toBeTruthy();
  const tagId = (await tag.json()).data._id as string;

  const pageSettings = await request.post(apiUrl + '/admin/page-settings', {
    headers: authHeaders,
    data: { pageType: 'landing', pageSlug: slug, title: pageTitle, subtitle: 'Temporary page.', isPublished: true }
  });
  expect(pageSettings.ok()).toBeTruthy();
  const pageId = (await pageSettings.json()).data._id as string;

  return { token, slug, navLabel, collectionTitle, tagName, pageTitle, navId, collectionId, tagId, pageId, columnId, linkId, cardId, promoId };
};

const cleanupRecords = async (request: APIRequestContext, records?: Records): Promise<void> => {
  if (!records) return;
  const authHeaders = headers(records.token);
  await request.delete(apiUrl + '/admin/navigation/' + records.navId, { headers: authHeaders }).catch(() => undefined);
  await request.put(apiUrl + '/admin/collections/' + records.collectionId, { headers: authHeaders, data: { isVisible: false, isPublished: false } }).catch(() => undefined);
  await request.put(apiUrl + '/admin/tags/' + records.tagId, { headers: authHeaders, data: { isVisible: false } }).catch(() => undefined);
  await request.put(apiUrl + '/admin/page-settings/' + records.pageId, { headers: authHeaders, data: { isPublished: false } }).catch(() => undefined);
};

const cleanupUiCrudRecords = async (request: APIRequestContext, records?: UiCrudRecords): Promise<void> => {
  if (!records) return;
  const authHeaders = headers(records.token);
  const navId = records.navId ?? (records.navSlug ? (await adminNavigationBySlug(request, records.token, records.navSlug))?._id : undefined);
  const collectionId = records.collectionId ?? (records.collectionSlug ? (await adminCollectionBySlug(request, records.token, records.collectionSlug))?._id : undefined);
  const tagId = records.tagId ?? (records.tagSlug ? (await adminTagBySlug(request, records.token, records.tagSlug))?._id : undefined);
  const pageId = records.pageId ?? (records.pageSlug ? (await adminPageBySlug(request, records.token, records.pageSlug))?._id : undefined);
  if (navId) await request.delete(apiUrl + '/admin/navigation/' + navId, { headers: authHeaders }).catch(() => undefined);
  if (collectionId) await request.put(apiUrl + '/admin/collections/' + collectionId, { headers: authHeaders, data: { isVisible: false, isPublished: false } }).catch(() => undefined);
  if (tagId) await request.put(apiUrl + '/admin/tags/' + tagId, { headers: authHeaders, data: { isVisible: false } }).catch(() => undefined);
  if (pageId) await request.put(apiUrl + '/admin/page-settings/' + pageId, { headers: authHeaders, data: { isPublished: false } }).catch(() => undefined);
};

test.describe('storefront manager visibility controls', () => {
  let records: Records | undefined;

  test.afterEach(async ({ request }) => {
    await cleanupRecords(request, records);
    records = undefined;
  });

  test('toggles visibility from every Storefront Manager tab and reflects publicly', async ({ page, request, isMobile }) => {
    test.skip(isMobile, 'full CRUD visibility flow is covered in the desktop project');
    records = await createRecords(request);
    const authHeaders = headers(records.token);

    await adminLogin(page);
    await page.goto(adminUrl + '/storefront');
    await expect(page.getByRole('heading', { name: 'Storefront' })).toBeVisible();

    await page.getByRole('button', { name: 'Hide ' + records.navLabel }).click();
    await expect(page.getByRole('button', { name: 'Show ' + records.navLabel })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      return body.data.some((item: { slug: string }) => item.slug === records?.slug);
    }).toBe(false);
    await page.getByRole('button', { name: 'Show ' + records.navLabel }).click();
    await expect(page.getByRole('button', { name: 'Hide ' + records.navLabel })).toBeVisible();

    await clickManagerTab(page, 'Mega Menu');
    await page.getByLabel('Navigation Item').selectOption(records.navId);
    await page.getByRole('button', { name: 'Hide Visibility QA Column' }).click();
    await expect(page.getByRole('button', { name: 'Show Visibility QA Column' })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      return body.data.find((item: { slug: string }) => item.slug === records?.slug)?.columns.length ?? -1;
    }).toBe(0);
    await page.getByRole('button', { name: 'Show Visibility QA Column' }).click();
    await expect(page.getByRole('button', { name: 'Hide Visibility QA Column' })).toBeVisible();

    await page.getByRole('button', { name: 'Hide Visibility QA Link' }).click();
    await expect(page.getByRole('button', { name: 'Show Visibility QA Link' })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      const nav = body.data.find((item: { slug: string }) => item.slug === records?.slug);
      return nav?.columns[0]?.links.length ?? -1;
    }).toBe(0);
    await page.getByRole('button', { name: 'Show Visibility QA Link' }).click();
    await expect(page.getByRole('button', { name: 'Hide Visibility QA Link' })).toBeVisible();

    await page.getByRole('button', { name: 'Hide ' + records.collectionTitle }).click();
    await expect(page.getByRole('button', { name: 'Show ' + records.collectionTitle })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      const nav = body.data.find((item: { slug: string }) => item.slug === records?.slug);
      return nav?.collectionCards.length ?? -1;
    }).toBe(0);
    await page.getByRole('button', { name: 'Show ' + records.collectionTitle }).click();
    await expect(page.getByRole('button', { name: 'Hide ' + records.collectionTitle })).toBeVisible();

    await page.getByRole('button', { name: 'Hide promo' }).click();
    await expect(page.getByRole('button', { name: 'Show promo' })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      const nav = body.data.find((item: { slug: string }) => item.slug === records?.slug);
      return nav?.promo ?? null;
    }).toBeNull();
    await page.getByRole('button', { name: 'Show promo' }).click();
    await expect(page.getByRole('button', { name: 'Hide promo' })).toBeVisible();

    await clickManagerTab(page, 'Collections');
    await page.getByRole('button', { name: 'Hide ' + records.collectionTitle }).click();
    await expect(page.getByRole('button', { name: 'Show ' + records.collectionTitle })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/collections')).json();
      return body.data.some((item: { slug: string }) => item.slug === records?.slug);
    }).toBe(false);
    await page.getByRole('button', { name: 'Show ' + records.collectionTitle }).click();
    await expect(page.getByRole('button', { name: 'Hide ' + records.collectionTitle })).toBeVisible();

    await clickManagerTab(page, 'Filters');
    await page.getByRole('button', { name: 'Hide ' + records.tagName }).click();
    await expect(page.getByRole('button', { name: 'Show ' + records.tagName })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/tags')).json();
      return body.data.some((item: { slug: string }) => item.slug === records?.slug);
    }).toBe(false);
    await page.getByRole('button', { name: 'Show ' + records.tagName }).click();
    await expect(page.getByRole('button', { name: 'Hide ' + records.tagName })).toBeVisible();

    await clickManagerTab(page, 'Pages');
    await page.getByRole('button', { name: 'Hide ' + records.pageTitle }).click();
    await expect(page.getByRole('button', { name: 'Show ' + records.pageTitle })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/page-settings/landing/' + records?.slug)).json();
      return body.data;
    }).toBeNull();
    await page.getByRole('button', { name: 'Show ' + records.pageTitle }).click();
    await expect(page.getByRole('button', { name: 'Hide ' + records.pageTitle })).toBeVisible();

    await request.put(apiUrl + '/admin/page-settings/' + records.pageId, { headers: authHeaders, data: { isPublished: true } });
    await expectNoHorizontalOverflow(page);
    await page.goto(storefrontUrl + '/');
    await expectNoHorizontalOverflow(page);
  });

  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    test('storefront manager tabs do not overflow at ' + width + 'px', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await adminLogin(page);
      await page.goto(adminUrl + '/storefront');
      await expect(page.getByRole('heading', { name: 'Storefront' })).toBeVisible();
      for (const label of ['Navigation', 'Mega Menu', 'Collections', 'Filters', 'Pages', 'Delivery', 'Settings']) {
        await clickManagerTab(page, label);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});

test.describe('storefront manager button and CRUD coverage', () => {
  let records: UiCrudRecords | undefined;

  test.afterEach(async ({ request }) => {
    await cleanupUiCrudRecords(request, records);
    records = undefined;
  });

  test('exercises admin buttons for CRUD and verifies storefront state', async ({ page, request, isMobile }) => {
    test.setTimeout(120000);
    test.skip(isMobile, 'button-by-button CRUD pass is covered in the desktop project');
    const token = await loginToken(request);
    const slug = 'button-crud-' + Date.now();
    records = { token, navSlug: slug, collectionSlug: slug, tagSlug: slug, pageSlug: slug };
    const updatedSlug = slug + '-updated';
    const navLabel = 'Button CRUD Nav ' + slug;
    const navLabelUpdated = navLabel + ' Updated';
    const collectionTitle = 'Button CRUD Collection ' + slug;
    const collectionTitleUpdated = collectionTitle + ' Updated';
    const tagName = 'Button CRUD Filter ' + slug;
    const tagNameUpdated = tagName + ' Updated';
    const pageTitle = 'Button CRUD Page ' + slug;
    const pageTitleUpdated = pageTitle + ' Updated';
    const linkLabel = 'Button CRUD Link';
    const linkLabelUpdated = linkLabel + ' Updated';
    const linkHref = '/' + slug + '/link';

    await adminLogin(page);
    await page.goto(adminUrl + '/storefront');
    await expect(page.getByRole('heading', { name: 'Storefront' })).toBeVisible();

    await page.getByLabel('Label').fill(navLabel);
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Href').fill('/' + slug);
    await page.getByLabel('Sort Order').fill('980');
    await page.getByRole('button', { name: 'Add Navigation' }).click();
    await expect.poll(async () => {
      const createdNav = await adminNavigationBySlug(request, token, slug);
      return createdNav?.label;
    }).toBe(navLabel);
    await expectOneRow(page, navLabel);
    let nav = await adminNavigationBySlug(request, token, slug);
    expect(nav?.label).toBe(navLabel);
    records.navId = nav?._id;
    records.navSlug = slug;
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(true);

    let row = await expectOneRow(page, navLabel);
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('button', { name: 'Save Navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Add Navigation' })).toBeVisible();

    row = await expectOneRow(page, navLabel);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Label').fill(navLabelUpdated);
    await page.getByLabel('Href').fill('/' + updatedSlug);
    await page.getByRole('button', { name: 'Save Navigation' }).click();
    await expectOneRow(page, navLabelUpdated);
    nav = await adminNavigationBySlug(request, token, slug);
    expect(nav?.label).toBe(navLabelUpdated);

    row = await expectOneRow(page, navLabelUpdated);
    await row.getByRole('button', { name: 'Hide ' + navLabelUpdated }).click();
    await expect(row.getByRole('button', { name: 'Show ' + navLabelUpdated })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/navigation')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(false);
    await row.getByRole('button', { name: 'Show ' + navLabelUpdated }).click();
    await expect(row.getByRole('button', { name: 'Hide ' + navLabelUpdated })).toBeVisible();

    await clickManagerTab(page, 'Mega Menu');
    expect(records.navId).toBeTruthy();
    await page.getByLabel('Navigation Item').selectOption(records.navId as string);
    const columnForm = page.locator('form').filter({ hasText: /^Column/ });
    await columnForm.getByLabel('Title').fill('Button CRUD Column');
    await columnForm.getByLabel('Sort Order').fill('0');
    await page.getByRole('button', { name: 'Add Column' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Column' })).toBeVisible();
    await expect.poll(async () => {
      nav = await adminNavigationBySlug(request, token, slug);
      return nav?.columns.some((column) => column.title === 'Button CRUD Column');
    }).toBe(true);

    await page.getByRole('button', { name: 'Edit Button CRUD Column' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Edit Button CRUD Column' }).click();
    await page.locator('form').filter({ hasText: /^Edit Column/ }).getByLabel('Title').fill('Button CRUD Column Updated');
    await page.getByRole('button', { name: 'Save Column' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Column Updated' })).toBeVisible();

    const linkForm = page.locator('form').filter({ hasText: /^Link/ });
    await linkForm.getByLabel('Label').fill(linkLabel);
    await linkForm.getByLabel('Href').fill(linkHref);
    await page.getByRole('button', { name: 'Add Link' }).click();
    await expect(page.getByText(linkLabel)).toBeVisible();
    nav = await adminNavigationBySlug(request, token, slug);
    expect(nav?.columns[0]?.links.some((link) => link.label === linkLabel)).toBe(true);

    await page.getByRole('button', { name: 'Edit ' + linkLabel }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Edit ' + linkLabel }).click();
    await page.locator('form').filter({ hasText: /^Edit Link/ }).getByLabel('Label').fill(linkLabelUpdated);
    await page.getByRole('button', { name: 'Save Link' }).click();
    await expect(page.getByText(linkLabelUpdated)).toBeVisible();

    await page.getByRole('button', { name: 'Delete ' + linkLabelUpdated }).click();
    await expect(page.getByText(linkLabelUpdated)).toBeHidden();
    await expect.poll(async () => {
      nav = await adminNavigationBySlug(request, token, slug);
      return nav?.columns[0]?.links.some((link) => link.label === linkLabelUpdated) ?? false;
    }).toBe(false);

    await linkForm.getByLabel('Label').fill(linkLabelUpdated);
    await linkForm.getByLabel('Href').fill(linkHref);
    await page.getByRole('button', { name: 'Add Link' }).click();
    await expect(page.getByText(linkLabelUpdated)).toBeVisible();
    await expect.poll(async () => {
      nav = await adminNavigationBySlug(request, token, slug);
      return nav?.columns[0]?.links.some((link) => link.label === linkLabelUpdated && link.href === linkHref) ?? false;
    }).toBe(true);

    const cardForm = page.locator('form').filter({ hasText: /^Collection Card/ });
    await cardForm.getByLabel('Title Override').fill('Button CRUD Card');
    await cardForm.getByLabel('Slug Override').fill(slug + '-card');
    await page.getByRole('button', { name: 'Add Card' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Card' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Button CRUD Card' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Edit Button CRUD Card' }).click();
    await page.locator('form').filter({ hasText: /^Edit Collection Card/ }).getByLabel('Title Override').fill('Button CRUD Card Updated');
    await page.getByRole('button', { name: 'Save Card' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Card Updated' })).toBeVisible();

    const promoForm = page.locator('form').filter({ hasText: 'Promo Panel' });
    const promoTitleInput = promoForm.locator('label').filter({ hasText: /^Title$/ }).locator('input');
    await promoForm.getByLabel('Eyebrow').fill('Button CRUD');
    await promoTitleInput.fill('Button CRUD Promo');
    await promoForm.getByLabel('Subtitle', { exact: true }).fill('Temporary promo');
    await promoForm.getByLabel('Button Label').fill('Open');
    await promoForm.getByLabel('Button Href').fill('/' + slug);
    await page.getByRole('button', { name: 'Save Promo' }).click();
    await expect.poll(async () => {
      nav = await adminNavigationBySlug(request, token, slug);
      return nav?.promo?.title;
    }).toBe('Button CRUD Promo');
    await expect(page.getByText('Promo: Visible')).toBeVisible();
    await page.getByRole('button', { name: 'Load Current' }).click();
    await expect(promoTitleInput).toHaveValue('Button CRUD Promo');
    expect(nav?.promo?._id).toBeTruthy();

    await page.getByRole('button', { name: 'Hide promo' }).click();
    await expect(page.getByRole('button', { name: 'Show promo' })).toBeVisible();
    await page.getByRole('button', { name: 'Show promo' }).click();
    await expect(page.getByRole('button', { name: 'Hide promo' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => {
      nav = await adminNavigationBySlug(request, token, slug);
      return nav?.promo;
    }).toBeFalsy();
    await page.getByRole('button', { name: 'Delete Button CRUD Card Updated' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Card Updated' })).toBeHidden();
    await page.getByRole('button', { name: 'Delete ' + linkLabelUpdated }).click();
    await expect(page.getByText(linkLabelUpdated)).toBeHidden();
    await page.getByRole('button', { name: 'Delete Button CRUD Column Updated' }).click();
    await expect(page.getByRole('heading', { name: 'Button CRUD Column Updated' })).toBeHidden();

    await clickManagerTab(page, 'Collections');
    await page.getByLabel('Title', { exact: true }).fill(collectionTitle);
    await page.getByLabel('Slug').fill(slug);
    await page.getByRole('button', { name: 'Add Collection' }).click();
    await expectOneRow(page, collectionTitle);
    const collection = await adminCollectionBySlug(request, token, slug);
    expect(collection?.title).toBe(collectionTitle);
    records.collectionId = collection?._id;
    records.collectionSlug = slug;

    row = await expectOneRow(page, collectionTitle);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    row = await expectOneRow(page, collectionTitle);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title', { exact: true }).fill(collectionTitleUpdated);
    await page.getByRole('button', { name: 'Save Collection' }).click();
    await expectOneRow(page, collectionTitleUpdated);
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/collections')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(true);

    row = await expectOneRow(page, collectionTitleUpdated);
    await row.getByRole('button', { name: 'Hide ' + collectionTitleUpdated }).click();
    await expect(row.getByRole('button', { name: 'Show ' + collectionTitleUpdated })).toBeVisible();
    await row.getByRole('button', { name: 'Show ' + collectionTitleUpdated }).click();
    await expect(row.getByRole('button', { name: 'Hide ' + collectionTitleUpdated })).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/collections')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(false);

    await clickManagerTab(page, 'Filters');
    await page.getByLabel('Name').fill(tagName);
    await page.getByLabel('Slug').fill(slug);
    await page.getByRole('button', { name: 'Add Chip' }).click();
    await expectOneRow(page, tagName);
    const tag = await adminTagBySlug(request, token, slug);
    expect(tag?.name).toBe(tagName);
    records.tagId = tag?._id;
    records.tagSlug = slug;

    row = await expectOneRow(page, tagName);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    row = await expectOneRow(page, tagName);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill(tagNameUpdated);
    await page.getByRole('button', { name: 'Save Chip' }).click();
    await expectOneRow(page, tagNameUpdated);
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/tags')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(true);

    row = await expectOneRow(page, tagNameUpdated);
    await row.getByRole('button', { name: 'Hide ' + tagNameUpdated }).click();
    await expect(row.getByRole('button', { name: 'Show ' + tagNameUpdated })).toBeVisible();
    await row.getByRole('button', { name: 'Show ' + tagNameUpdated }).click();
    await expect(row.getByRole('button', { name: 'Hide ' + tagNameUpdated })).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/tags')).json();
      return body.data.some((item: { slug: string }) => item.slug === slug);
    }).toBe(false);

    await clickManagerTab(page, 'Pages');
    await page.getByLabel('Page Type').fill('landing');
    await page.getByLabel('Page Slug').fill(slug);
    await page.getByLabel('Title', { exact: true }).fill(pageTitle);
    await page.getByRole('button', { name: 'Add Page' }).click();
    await expectOneRow(page, pageTitle);
    const pageRecord = await adminPageBySlug(request, token, slug);
    expect(pageRecord?.title).toBe(pageTitle);
    records.pageId = pageRecord?._id;
    records.pageSlug = slug;

    row = await expectOneRow(page, pageTitle);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    row = await expectOneRow(page, pageTitle);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title', { exact: true }).fill(pageTitleUpdated);
    await page.getByRole('button', { name: 'Save Page' }).click();
    await expectOneRow(page, pageTitleUpdated);
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/page-settings/landing/' + slug)).json();
      return body.data?.title;
    }).toBe(pageTitleUpdated);
    row = await expectOneRow(page, pageTitleUpdated);
    await row.getByRole('button', { name: 'Hide ' + pageTitleUpdated }).click();
    await expect(row.getByRole('button', { name: 'Show ' + pageTitleUpdated })).toBeVisible();
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/page-settings/landing/' + slug)).json();
      return body.data;
    }).toBeNull();
    await row.getByRole('button', { name: 'Show ' + pageTitleUpdated }).click();
    await expect(row.getByRole('button', { name: 'Hide ' + pageTitleUpdated })).toBeVisible();

    const siteBefore = (await (await request.get(apiUrl + '/admin/site-settings', { headers: headers(token) })).json()).data as {
      defaultGridView: 1 | 2 | 4;
      isFlashlightEnabled: boolean;
      standardShippingRate: number;
      standardShippingCompareAt: number;
      expressShippingRate: number;
      freeStandardShippingThreshold: number;
    };
    await clickManagerTab(page, 'Delivery');
    await page.getByLabel('Standard delivery charge (₹)').fill('99');
    await page.getByLabel('Original price to strike out (₹)').fill('99');
    await page.getByLabel('Express delivery charge (₹)').fill('199');
    await page.getByLabel('Free standard delivery above (₹)').fill('1000');
    await expect(page.getByText('Cart preview at threshold').locator('..')).toContainText('₹99');
    await expect(page.getByText('Cart preview at threshold').locator('..')).toContainText('Free');
    const deliverySave = page.waitForResponse((response) => response.url().endsWith('/admin/site-settings') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Delivery Settings' }).click();
    const deliverySaveBody = await (await deliverySave).json();
    expect(deliverySaveBody.data).toMatchObject({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1000
    });
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/site-settings')).json();
      return {
        standardShippingRate: body.data.standardShippingRate,
        standardShippingCompareAt: body.data.standardShippingCompareAt,
        expressShippingRate: body.data.expressShippingRate,
        freeStandardShippingThreshold: body.data.freeStandardShippingThreshold
      };
    }).toEqual({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1000
    });
    await page.getByLabel('Standard delivery charge (₹)').fill('0');
    await page.getByLabel('Free standard delivery above (₹)').fill('0');
    await expect(page.getByText('Cart preview below threshold').locator('..')).toContainText('₹99');
    await expect(page.getByText('Cart preview below threshold').locator('..')).toContainText('Free');

    await clickManagerTab(page, 'Settings');
    const nextGrid = siteBefore.defaultGridView === 4 ? 2 : 4;
    const gridSelect = page.getByLabel('Default Grid');
    const gridSave = page.waitForResponse((response) => response.url().endsWith('/admin/site-settings') && response.request().method() === 'PUT');
    await gridSelect.selectOption(String(nextGrid));
    const gridSaveBody = await (await gridSave).json();
    expect(gridSaveBody.data.defaultGridView).toBe(nextGrid);
    await expect(gridSelect).toHaveValue(String(nextGrid));
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/site-settings')).json();
      return body.data.defaultGridView;
    }).toBe(nextGrid);
    const flashlightSave = page.waitForResponse((response) => response.url().endsWith('/admin/site-settings') && response.request().method() === 'PUT');
    const flashlightToggle = page.getByLabel('Flashlight enabled');
    await flashlightToggle.click();
    const flashlightSaveBody = await (await flashlightSave).json();
    expect(flashlightSaveBody.data.isFlashlightEnabled).toBe(!siteBefore.isFlashlightEnabled);
    await expect(flashlightToggle).toBeChecked({ checked: !siteBefore.isFlashlightEnabled });
    await expect.poll(async () => {
      const body = await (await request.get(apiUrl + '/site-settings')).json();
      return body.data.isFlashlightEnabled;
    }).toBe(!siteBefore.isFlashlightEnabled);
    await request.put(apiUrl + '/admin/site-settings', { headers: headers(token), data: siteBefore });

    await clickManagerTab(page, 'Navigation');
    row = await expectOneRow(page, navLabelUpdated);
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => adminNavigationBySlug(request, token, slug)).toBeUndefined();
    records.navId = undefined;
    await expectNoHorizontalOverflow(page);
  });
});
