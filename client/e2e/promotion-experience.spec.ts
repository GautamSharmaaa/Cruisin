import { expect, test, type Page, type Route } from '@playwright/test';

const envelope = (data: unknown, message = 'ok') => ({ success: true, data, message });
const promotion = {
  enabled: true,
  campaignKey: 'playwright-cruisin10',
  promotion: { id: '665f6d8403bd2edc93800001', code: 'CRUISIN10', type: 'percentage', value: 10, displayValue: '10% OFF', discountLabel: '10%' },
  placements: { popup: true, bagMarquee: true, checkoutStrip: true },
  popup: { eyebrow: 'PRIVATE OFFER', headline: '{{discount}} OFF YOUR ORDER', description: 'Apply {{code}} and save.', primaryCta: 'APPLY {{discount}} OFF', secondaryCta: 'CONTINUE SHOPPING', delayMs: 0, frequency: 'once_per_session' },
  marquee: { available: '{{code}} · {{discount}} OFF · TAP TO APPLY', applied: '{{code}} APPLIED ✓ · YOU SAVE {{saving}}' },
  checkout: { available: '{{code}} AVAILABLE · TAP TO APPLY {{discount}} OFF', applied: '✓ {{code}} APPLIED · YOU SAVE {{saving}}' },
  schedule: {}
};
const product = {
  id: '665f6d8403bd2edc93800010', title: 'Promotion QA Tee', slug: 'promotion-qa-tee', description: '', richDescription: '', brand: 'CRUISIN', category: 'T-Shirts', categoryIds: [], collections: [], images: [{ url: '/cruisin-image-fallback.svg', alt: 'Promotion QA Tee', width: 800, height: 1000 }], basePrice: 1000,
  variants: [{ id: '665f6d8403bd2edc93800011', size: 'M', color: 'Black', colorHex: '#000000', sku: 'PROMO-QA-M', price: 1000, stock: 5, enabled: true, images: [] }],
  tags: [], status: 'published', visibility: 'visible', isActive: true, isArchived: false, isFeatured: false, ratings: { avg: 0, count: 0 }, seo: { metaTitle: '', metaDesc: '', ogImage: '' }, reviews: []
};

const seedCart = async (page: Page, withSession = false): Promise<void> => {
  await page.addInitScript(({ product, withSession }) => {
    localStorage.setItem('cruisin-cart', JSON.stringify({ state: { items: [{ product, variantId: product.variants[0].id, size: 'M', color: 'Black', quantity: 1, price: 1000 }], isOpen: false, couponDiscount: 0, freeShipping: false }, version: 0 }));
    if (withSession) localStorage.setItem('cruisin_has_session', 'true');
    else localStorage.removeItem('cruisin_has_session');
    sessionStorage.clear();
  }, { product, withSession });
};

const apiRoute = async (route: Route, activePromotion: unknown = promotion): Promise<void> => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  if (path.endsWith('/promotion-experience')) return route.fulfill({ status: 200, json: envelope(activePromotion) });
  if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 200, json: envelope({ accessToken: 'playwright-token' }) });
  if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, json: envelope({ id: 'customer-id', name: 'QA Customer', email: 'qa@example.com', role: 'customer', isVerified: true }) });
  if (path.endsWith('/wishlist')) return route.fulfill({ status: 200, json: envelope({ products: [] }) });
  if (path.includes('/account/addresses') || path.endsWith('/addresses')) return route.fulfill({ status: 200, json: envelope([]) });
  if (path.endsWith('/payments/config')) return route.fulfill({ status: 200, json: envelope({ codEnabled: true, codFee: 49, maxCodOrderValue: 100000, partialPaymentEnabled: false, minPartialPaymentOrderValue: 0 }) });
  if (path.endsWith('/site-settings')) return route.fulfill({ status: 200, json: envelope({ standardShippingRate: 0, expressShippingRate: 0, freeStandardShippingThreshold: 0, standardShippingCompareAt: 0 }) });
  if (path.endsWith('/cart/coupon')) return route.fulfill({ status: 200, json: envelope({ coupon: 'CRUISIN10', discount: 100, freeShipping: false, eligibleSubtotal: 1000 }) });
  if (path.endsWith('/cart') && request.method() === 'GET') return route.fulfill({ status: 200, json: envelope({ items: [{ product: product.id, variant: product.variants[0].id, quantity: 1, price: 1000 }] }) });
  if (path.includes('/cart/')) return route.fulfill({ status: 200, json: envelope({ items: [] }) });
  if (path.endsWith('/products')) return route.fulfill({ status: 200, json: envelope({ items: [], total: 0, page: 1, pages: 0 }) });
  if (path.endsWith('/navigation') || path.endsWith('/collections') || path.endsWith('/categories') || path.endsWith('/tags')) return route.fulfill({ status: 200, json: envelope([]) });
  return route.fulfill({ status: 200, json: envelope(null) });
};

test.describe('Admin-controlled promotion storefront journey', () => {
  test('shows a mobile-first popup once per session and respects dismissal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { localStorage.removeItem('cruisin-cart'); localStorage.removeItem('cruisin_has_session'); sessionStorage.clear(); });
    await page.route('**/api/v1/**', (route) => apiRoute(route));
    await page.goto('/shop');
    const dialog = page.getByRole('dialog', { name: /10% OFF YOUR ORDER/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('bottom', '0px');
    await dialog.getByRole('button', { name: 'CONTINUE SHOPPING' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByRole('dialog', { name: /10% OFF YOUR ORDER/i })).toHaveCount(0);
  });

  test('applies from Bag through the coupon API and renders actual saving', async ({ page }) => {
    await seedCart(page);
    await page.route('**/api/v1/**', (route) => apiRoute(route));
    await page.goto('/cart');
    const marquee = page.getByRole('button', { name: /CRUISIN10.*TAP TO APPLY/i });
    await expect(marquee).toBeVisible();
    await marquee.click();
    await expect(page.getByRole('status').filter({ hasText: /CRUISIN10 APPLIED/ })).toBeVisible();
    await expect(page.getByText('You save ₹100', { exact: true })).toBeVisible();
  });

  test('applies from Checkout without navigation or page reload', async ({ page }) => {
    await seedCart(page, true);
    await page.route('**/api/v1/**', (route) => apiRoute(route));
    await page.goto('/checkout');
    const strip = page.getByRole('button', { name: /CRUISIN10 AVAILABLE/i });
    await expect(strip).toBeVisible();
    await strip.click();
    await expect(page.getByRole('status').filter({ hasText: /CRUISIN10 APPLIED/ })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('master OFF removes automatic promotion placements', async ({ page }) => {
    await seedCart(page);
    await page.route('**/api/v1/**', (route) => apiRoute(route, null));
    await page.goto('/cart');
    await expect(page.getByRole('button', { name: /CRUISIN10.*TAP TO APPLY/i })).toHaveCount(0);
    await expect(page.getByText('Coupon Code')).toBeVisible();
  });
});
