import { expect, type Locator, type Page, test } from '@playwright/test';

type ShiftDetail = { time: number; value: number; sources: Array<{ node: string; previous: string; current: string }> };
type Metrics = { ttfb: number; domContentLoaded: number; load: number; fcp: number | null; lcp: number | null; cls: number; clsSources: string[]; layoutShifts: ShiftDetail[]; transferKb: number; resources: number; longTasks: number; slowResources: Array<{ name: string; duration: number; initiator: string }> };

const instrument = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const state = { cls: 0, lcp: 0, sources: [] as string[], shifts: [] as ShiftDetail[] };
    Object.defineProperty(window, '__qaPerformance', { value: state, configurable: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number; sources?: Array<{ node?: Node | null; previousRect?: DOMRectReadOnly; currentRect?: DOMRectReadOnly }> }>) if (!entry.hadRecentInput) {
      state.cls += entry.value ?? 0;
      const sources = (entry.sources ?? []).map((source) => {
        const node = source.node instanceof Element ? source.node.tagName.toLowerCase() + (source.node.id ? '#' + source.node.id : '') + (source.node.className && typeof source.node.className === 'string' ? '.' + source.node.className.trim().replace(/\s+/g, '.') : '') : 'unknown';
        state.sources.push(node);
        const rect = (value?: DOMRectReadOnly): string => value ? [value.x, value.y, value.width, value.height].map((item) => Math.round(item)).join(',') : '';
        return { node, previous: rect(source.previousRect), current: rect(source.currentRect) };
      });
      state.shifts.push({ time: Math.round(entry.startTime), value: Number((entry.value ?? 0).toFixed(4)), sources });
    } }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => { const entry = list.getEntries().at(-1); if (entry) state.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
};

const metricsFor = async (page: Page, url: string): Promise<Metrics> => {
  await instrument(page);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]));
    const state = (window as typeof window & { __qaPerformance?: { cls: number; lcp: number; sources: string[]; shifts: ShiftDetail[] } }).__qaPerformance;
    return {
      ttfb: Math.round(nav.responseStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      fcp: paints['first-contentful-paint'] ? Math.round(paints['first-contentful-paint']) : null,
      lcp: state?.lcp ? Math.round(state.lcp) : null,
      cls: Number((state?.cls ?? 0).toFixed(4)),
      clsSources: [...new Set(state?.sources ?? [])].slice(0, 12),
      layoutShifts: state?.shifts ?? [],
      transferKb: Math.round((nav.transferSize + resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)) / 1024),
      resources: resources.length,
      longTasks: performance.getEntriesByType('longtask').length,
      slowResources: [...resources].sort((left, right) => right.duration - left.duration).slice(0, 5).map((entry) => ({ name: entry.name, duration: Math.round(entry.duration), initiator: entry.initiatorType }))
    };
  });
};

test.describe('local production performance budgets', () => {
  for (const route of ['/', '/shop', '/product/void-drape-hoodie']) {
    test(`${route} stays within local production smoke budgets`, async ({ page }, testInfo) => {
      const metrics = await metricsFor(page, route);
      console.log('[performance]', JSON.stringify({ route, ...metrics }));
      await testInfo.attach('performance.json', { body: JSON.stringify({ route, ...metrics }, null, 2), contentType: 'application/json' });
      expect(metrics.ttfb).toBeLessThan(1000);
      expect(metrics.fcp ?? Number.POSITIVE_INFINITY).toBeLessThan(2500);
      expect(metrics.lcp ?? Number.POSITIVE_INFINITY).toBeLessThan(3000);
      expect(metrics.cls).toBeLessThan(0.1);
      expect(metrics.load).toBeLessThan(5000);
    });
  }
});

test.describe('mobile scroll stability', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the buy bar is visible on entry and scrolls inline before recommendations', async ({ page }) => {
    // The product has already been fetched for this page. It should render
    // even if the browser's product request is delayed or unavailable.
    await page.route('**/api/v1/products/void-drape-hoodie', route => route.abort());
    await page.goto('/product/void-drape-hoodie');
    const buyBar = page.getByRole('region', { name: 'Purchase options' });
    await expect(buyBar).toBeVisible();
    const geometry = () => page.locator('.pdp-mobile-dock').evaluate(element => {
      const bar = element.getBoundingClientRect();
      const info = document.querySelector('.pdp-information')?.getBoundingClientRect();
      return { top: bar.top, bottom: bar.bottom, height: bar.height, viewport: innerHeight, scroll: scrollY, detailsEnd: info?.bottom ?? 0 };
    });
    const initial = await geometry();
    expect(Math.abs(initial.bottom - initial.viewport)).toBeLessThan(2);
    await expect(page.locator('html')).toHaveAttribute('data-scroll-mode', 'native');

    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), initial.scroll + initial.detailsEnd + initial.height - initial.viewport + 160);
    await expect.poll(async () => (await geometry()).bottom).toBeLessThan(initial.viewport - 100);
    const inline = await geometry();
    expect(inline.top).toBeGreaterThanOrEqual(inline.detailsEnd);
    await buyBar.getByRole('button', { name: 'Select size', exact: true }).click();
    const sizes = page.getByRole('dialog', { name: 'Select size', exact: true });
    await expect(sizes).toBeVisible();
    expect(Math.abs((await geometry()).top - inline.top)).toBeLessThan(2);
    await sizes.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(sizes).toBeHidden();
    expect(Math.abs((await geometry()).top - inline.top)).toBeLessThan(2);
  });

  test('sorting keeps the scrolled catalogue in place until results arrive', async ({ page }) => {
    let finishSort: (() => void) | undefined;
    const pendingSort = new Promise<void>(resolve => { finishSort = resolve; });
    await page.route(/\/api\/v1\/products\?/, async route => {
      const sort = new URL(route.request().url()).searchParams.get('sort');
      if (sort === 'price-asc') await pendingSort;
      await route.continue();
    });
    const collection = page.locator('#main .collection-page');
    const toolbar = collection.locator('.collection-controls-surface');
    const results = collection.getByRole('region', { name: 'Shop All', exact: true });
    const tapInViewport = async (target: Locator): Promise<void> => {
      await expect(target).toBeInViewport({ ratio: 1 });
      const bounds = await target.boundingBox();
      if (!bounds) throw new Error('Expected a visible sort control');
      // Locator clicks can scroll sticky elements into view before clicking.
      await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    };
    try {
      await page.goto('/shop');
      const articles = collection.locator('.editorial-product-card');
      await expect(articles.first()).toBeVisible();
      const originalTitle = await articles.first().locator('h3').textContent();
      await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
      await expect(page.locator('.editorial-navbar')).toHaveAttribute('data-hidden', 'true');
      await expect.poll(() => toolbar.evaluate(controls => Math.abs(controls.getBoundingClientRect().top))).toBeLessThan(2);
      const scrollBefore = await page.evaluate(() => scrollY);

      await tapInViewport(collection.getByRole('button', { name: 'Sort by', exact: true }));
      expect(Math.abs(await page.evaluate(() => scrollY) - scrollBefore)).toBeLessThan(2);
      await tapInViewport(page.getByRole('button', { name: 'Price, low to high', exact: true }));
      await expect(page).toHaveURL(/sort=price-asc/);
      await expect(results).toHaveAttribute('aria-busy', 'true');
      await expect(articles.first().locator('h3')).toHaveText(originalTitle ?? '');
      expect(Math.abs(await page.evaluate(() => scrollY) - scrollBefore)).toBeLessThan(2);

      finishSort?.();
      await expect(results).toHaveAttribute('aria-busy', 'false');
      expect(Math.abs(await page.evaluate(() => scrollY) - scrollBefore)).toBeLessThan(2);
      await page.evaluate(() => window.scrollBy({ top: -150, behavior: 'instant' }));
      await expect(page.locator('.editorial-navbar')).toHaveAttribute('data-hidden', 'false');
      await expect.poll(() => toolbar.evaluate(controls => {
        const headerBottom = document.querySelector('.editorial-navbar')?.getBoundingClientRect().bottom ?? 0;
        return Math.abs(controls.getBoundingClientRect().top - headerBottom);
      })).toBeLessThan(2);
    } finally {
      finishSort?.();
    }
  });
});
