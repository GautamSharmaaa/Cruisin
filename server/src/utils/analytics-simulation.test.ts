// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { createAnalyticsSimulation } from './analytics-simulation.js';

describe('analytics simulation ground truth', () => {
  it('creates a deterministic two-month ecommerce data set', () => {
    const simulation = createAnalyticsSimulation('ANALYTICS_QA_BATCH_TEST');
    expect(simulation.users).toHaveLength(144);
    expect(simulation.products).toHaveLength(10);
    expect(simulation.categories).toHaveLength(5);
    expect(simulation.collections).toHaveLength(4);
    expect(simulation.coupons).toHaveLength(3);
    expect(simulation.carts).toHaveLength(260);
    expect(simulation.orders).toHaveLength(181);
    expect(simulation.expected.ranges.full60.summary.totalOrders).toBe(180);
    expect(simulation.expected.ranges.full60.summary.netRevenue).toBe(836992.58);
    expect(simulation.expected.ranges.full60.summary.cancelledOrders).toBe(17);
    expect(simulation.expected.ranges.full60.topProducts[0]?.title).toBe('QA Analytics Jacket');
  });

  it('excludes future, cancelled, failed, pending, and fully refunded orders from paid net revenue', () => {
    const simulation = createAnalyticsSimulation('ANALYTICS_QA_BATCH_TEST');
    const full60 = simulation.expected.ranges.full60;
    const allRangeTotals = simulation.orders.reduce((sum, order) => sum + order.total, 0);
    expect(full60.summary.totalOrders).toBeLessThan(simulation.orders.length);
    expect(full60.summary.netRevenue).toBeLessThan(allRangeTotals);
    expect(full60.summary.failedPaymentOrders).toBeGreaterThan(0);
    expect(full60.summary.pendingOrders).toBeGreaterThan(0);
    expect(full60.summary.refundedOrders).toBeGreaterThan(0);
  });

  it('keeps important date ranges and sale-week boundaries stable', () => {
    const simulation = createAnalyticsSimulation('ANALYTICS_QA_BATCH_TEST');
    expect(simulation.expected.ranges.last7.startDate).toBe('2026-06-26');
    expect(simulation.expected.ranges.last7.endDate).toBe('2026-07-02');
    expect(simulation.expected.ranges.saleWeek.startDate).toBe('2026-06-03');
    expect(simulation.expected.ranges.saleWeek.endDate).toBe('2026-06-10');
    expect(simulation.expected.ranges.lastMonth.startDate).toBe('2026-06-01');
    expect(simulation.expected.ranges.lastMonth.endDate).toBe('2026-06-30');
  });
});
