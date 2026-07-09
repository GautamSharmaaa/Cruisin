# Analytics Two-Month Simulation QA Report

## 1. Executive Summary

Overall analytics health: substantially improved. The admin analytics page was previously driven by static mock data; it now uses a real admin analytics API backed by MongoDB orders, products, categories, collections, coupons, and users.

Production readiness: 82%.

Biggest remaining risks:
- No storefront event/session model exists for true visitor, product-view, add-to-cart, checkout-started, or funnel analytics.
- Returns are not a first-class order status; refund handling is supported through `paymentStatus=refunded` and `refundAmount`.
- Existing non-analytics E2E tests still fail in catalogue/admin-login/storefront-menu flows.

What was fixed:
- Added deterministic 60-day analytics simulation seed and cleanup commands.
- Added test markers and optional `analyticsTestBatchId` filtering.
- Added real analytics summary API with date presets, custom ranges, status handling, coupon aggregation, product/category/collection rankings, customer counts, and INR revenue rules.
- Replaced mock admin analytics UI with API-backed cards, charts, tables, CSV export, refresh, custom date ranges, and batch filtering.
- Fixed 360px admin overflow by removing the global 375px body minimum width.

## 2. Analytics Feature Inventory

| Metric/Feature | Exists | Tested | Correct | Notes |
|---|---|---|---|---|
| Revenue | Yes | Yes | Yes | Net revenue excludes pending, failed, cancelled; refunded reduces by `refundAmount`. |
| Gross revenue | Yes | Yes | Yes | Sum of revenue-eligible order subtotals before discounts. |
| Orders | Yes | Yes | Yes | Total, paid, pending, failed, cancelled, refunded exposed. |
| AOV | Yes | Yes | Yes | Net revenue / paid orders. |
| Customers | Yes | Yes | Yes | Distinct ordering users in range. |
| New customers | Yes | Yes | Yes | User `createdAt` in selected range. |
| Returning customers | Yes | Yes | Yes | Prior account or multiple orders in range. |
| Top products | Yes | Yes | Yes | By allocated net revenue and quantity. |
| Top categories | Yes | Yes | Yes | Product category attribution, no duplicate category expansion. |
| Top collections | Yes | Yes | Yes | Product collection attribution. |
| Coupons | Yes | Yes | Yes | Uses order `couponCode`, discount, order count, revenue. |
| Discounts | Yes | Yes | Yes | Coupon discounts included. |
| Refunds | Partial | Yes | Yes | Full refund modeled via `paymentStatus=refunded` and `refundAmount`. |
| Cancelled orders | Yes | Yes | Yes | Excluded from revenue, counted separately. |
| Date filters | Yes | Yes | Yes | Full 60, last 30, previous 30, last 7, this month, last month, sale week, custom. |
| Charts | Yes | Yes | Yes | Revenue/orders and payment status render in admin. |
| Tables | Yes | Yes | Yes | Product, category, collection, coupon, status tables render. |
| Export/download | Yes | Smoke | Yes | CSV buttons present and wired client-side. |
| Funnel | No | Documented | N/A | No storefront event model exists. |

## 3. Test Data Generated

Batch ID: `ANALYTICS_QA_BATCH_20260702174156`

Date range: `2026-05-04` through `2026-07-02` in `Asia/Kolkata`.

Generated:
- Users: 144
- Carts: 260
- Orders: 181 total documents, 180 inside the 60-day range, 1 future boundary order
- Paid orders in 60-day range: 136
- Cancelled orders: 17
- Refunded orders: 5
- Products: 10
- Categories: 5
- Collections: 4
- Coupons: 3

Fixture: `server/test-fixtures/analytics/expected-analytics-summary.json`

## 4. Ground Truth vs Dashboard

| Range | Expected Orders | Expected Net Revenue | API Actual | UI Actual | Status |
|---|---:|---:|---:|---:|---|
| Full 60 days | 180 | 836992.58 | Match | Match | Pass |
| Last 30 days | 94 | 441396.87 | Match | API-backed | Pass |
| Previous 30 days | 86 | 395595.71 | Match | API-backed | Pass |
| Last 7 days | 25 | 129275.10 | Match | Match | Pass |
| This month | 9 | 46164.90 | Match | API-backed | Pass |
| Last month | 92 | 435523.92 | Match | API-backed | Pass |
| Sale week | 24 | 70046.37 | Match | API-backed | Pass |

Full-range key values:
- Gross revenue: 837790
- Net revenue: 836992.58
- AOV: 6154.36
- Discounts: 16126.80
- Customers: 134
- Top product: QA Analytics Jacket
- Top coupon by discount: ANALYTICS10

## 5. API Testing Report

Routes tested:
- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/analytics/summary`

Auth checks:
- No token: `401 Authentication required`
- Non-admin token: `403 Admin permission required`
- Admin token: `200`

Date checks:
- Full 60-day custom range: exact match
- Last 30: exact match
- Previous 30: exact match
- Last 7: exact match
- This month: exact match
- Last month: exact match
- Sale week: exact match
- Future empty range: `0` orders, `0` revenue
- Invalid reversed range: `400`

Observed API response times while running local dev:
- Full 60 summary: about 19-27 ms
- Last 7 summary: about 9 ms
- Future empty range: about 5 ms

## 6. Browser Testing Report

Admin page tested: `http://localhost:3001/analytics`

Verified:
- Admin login succeeded with local seed admin.
- Analytics page loaded without crash.
- Full 60-day batch-filtered UI showed expected revenue, orders, product, category, collection, coupon, and status data.
- Last 7 days preset updated range and values correctly.
- Console warnings/errors after analytics load: none captured.
- Viewports tested: 1440, 1280, 1024, 768, 430, 390, 360.
- Analytics page horizontal overflow: none after global min-width fix.

## 7. UI/UX Report

What is good:
- Revenue, orders, AOV, discounts, customers, cancellations, and refunds are visible immediately.
- Date presets are simple and fast.
- Batch filter makes QA verification exact without hiding all-data analytics.
- Tables scroll locally and the page remains usable on mobile widths.

What was confusing:
- Existing mock analytics UI gave a polished but incorrect view because it was not connected to real data.

What was fixed:
- Mock dashboard replaced with real API data.
- INR formatting used consistently.
- Responsive 360px overflow removed.

Still needed:
- Funnel-specific UI should wait for a real event/session model.

## 8. Security Report

Verified:
- Analytics routes require auth.
- Customer/non-admin token is denied.
- Analytics response avoids shipping/billing address payloads.
- Product `costPrice` is not selected or returned.
- Invalid date range returns `400`, not a crash.
- Batch filtering uses exact string match, not dynamic Mongo query objects.

## 9. Performance Report

Current local performance is acceptable for the seeded 2-month data set.

Indexes added/used:
- `orders.createdAt + paymentStatus + orderStatus`
- Existing indexes on order status, payment status, user, products, categories, collections, coupons.
- Test marker indexes on generated collections.

Future performance recommendation:
- For larger production volumes, move the product/category/collection summary to Mongo aggregation pipelines or a nightly aggregate collection once order volume materially grows.

## 10. Bugs Found And Fixed

| ID | Bug | Root Cause | Fix | Retest |
|---|---|---|---|---|
| AQA-1 | Admin analytics showed static mock data | UI imported `mockData` instead of API | Rebuilt analytics dashboard around `/admin/analytics/summary` | Browser pass |
| AQA-2 | No deterministic analytics QA data | Missing simulator/seeder | Added deterministic generator, seed, cleanup, expected JSON | Tests pass |
| AQA-3 | Could not isolate QA batch from existing local orders | API always queried all orders | Added optional `analyticsTestBatchId` filter | API exact match |
| AQA-4 | Revenue/status handling was too thin | Old endpoint only summed paid totals by day | Added explicit revenue rules and status buckets | API exact match |
| AQA-5 | 360px admin page overflow | Global `html, body` min-width 375px | Changed min-width to 0 | Responsive pass |

## 11. Files Changed

Analytics-scoped files changed:
- `admin/app/globals.css`
- `admin/components/dashboard/analytics/analytics-dashboard.tsx`
- `admin/hooks/useAdminResources.ts`
- `admin/types/dto.types.ts`
- `server/package.json`
- `server/src/controllers/admin.controller.ts`
- `server/src/routes/v1/admin.routes.ts`
- `server/src/services/admin.service.ts`
- `server/src/models/cart.model.ts`
- `server/src/models/category.model.ts`
- `server/src/models/collection.model.ts`
- `server/src/models/coupon.model.ts`
- `server/src/models/inventory.model.ts`
- `server/src/models/order.model.ts`
- `server/src/models/product.model.ts`
- `server/src/models/user.model.ts`
- `server/src/scripts/seed-analytics-simulation.ts`
- `server/src/scripts/cleanup-analytics-simulation.ts`
- `server/src/utils/analytics-simulation.ts`
- `server/src/utils/analytics-simulation.test.ts`
- `server/src/routes/v1/admin.routes.test.ts`
- `server/test-fixtures/analytics/expected-analytics-summary.json`
- `ANALYTICS_TWO_MONTH_SIMULATION_QA_REPORT.md`

Note: the worktree also contains unrelated pre-existing catalogue/storefront changes.

## 12. Commands Run

Seed:
- `npm --workspace server run analytics:test:seed`

Cleanup:
- `npm --workspace server run analytics:test:cleanup`

Verification:
- `npm --workspace server run typecheck`
- `npm --workspace admin run typecheck`
- `npm --workspace server run test`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

Manual/browser:
- Admin login at `http://localhost:3001/login`
- Admin analytics at `http://localhost:3001/analytics`
- API curl checks for full range, last 30, future empty range, invalid range, no-token, non-admin.

## 13. Cleanup Status

Data kept in local MongoDB for future analytics testing.

Batch ID: `ANALYTICS_QA_BATCH_20260702174156`

Cleanup command:

```bash
npm --workspace server run analytics:test:cleanup
```

To remove only this batch:

```bash
ANALYTICS_QA_BATCH_ID=ANALYTICS_QA_BATCH_20260702174156 npm --workspace server run analytics:test:cleanup
```

## 14. Final Checklist

| Check | Status |
|---|---|
| 2-month analytics data created | Pass |
| Users generated | Pass |
| Orders generated | Pass |
| Paid/cancelled/refunded orders generated | Pass |
| Coupons generated | Pass |
| Products/categories/collections included | Pass |
| Analytics APIs tested | Pass |
| Admin analytics UI tested | Pass |
| Revenue correct | Pass |
| Orders correct | Pass |
| AOV correct | Pass |
| Date filters correct | Pass |
| Top products correct | Pass |
| Top categories correct | Pass |
| Coupon analytics correct | Pass |
| Cancelled/failed orders handled correctly | Pass |
| Refunds handled correctly if supported | Pass |
| Charts render correctly | Pass |
| Tables render correctly | Pass |
| E2E suite fully green | Fail, existing non-analytics failures |

## Verification Caveats

`npm run build` initially failed because it was run while dev servers were active and Next.js was writing the same `.next` directories. After stopping dev servers and cleaning only generated `.next` artifacts, `npm run build` passed.

`npm run test:e2e` ended with 17 passed, 8 failed, 5 skipped. Failures were in existing catalogue login/responsive tests and storefront menu tests, not the analytics dashboard.
