import { expect, type Page, test } from '@playwright/test';

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
