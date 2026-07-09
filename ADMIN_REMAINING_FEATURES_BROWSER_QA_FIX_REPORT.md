# Admin Remaining Features Browser QA Fix Report

Date: 2026-07-08
Environment: local dev stack, Mongo Docker container, API `:8000`, storefront `:3000`, admin `:3001`

## Executive Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Clean stack | PASS | `npm install`, `npm run dev:db`, `npm --workspace server run seed`, `npm run dev`; health endpoint returned `API healthy`; ports 3000/3001/8000 owned by the fresh dev stack. |
| E2E blocker fixes | PASS | Full Playwright suite now passes: 53 passed, 9 expected skips. |
| Category form accessibility/testability | PASS | Unique labels for category name/slug/description/canonical slug, open accordion sections, sticky save action, toast feedback, slug race removed. |
| Storefront Manager CRUD | PASS | Navigation row persistence fixed in e2e; full tab visibility and deep CRUD browser specs pass. |
| Product CRUD browser path | PASS | Product form labels disambiguated; slug race removed; product list assertion updated for current card UI. |
| Discounts/coupon targeting path | PASS | Coupon optional numeric validation fixed; coupon browser create/apply flow passes. |
| Cleanup | PASS | Mongo verification returned zero `Live Browser Admin` categories/products/coupons after runs. |

## Fixes Applied

| File | Fix | Why |
| --- | --- | --- |
| `admin/components/dashboard/category-manager.tsx` | Renamed ambiguous labels to `Category Name`, `Category Slug`, `Category Description`, `Category Canonical Slug`; made sections open by default; added sticky save bar and toast feedback; removed blur-time slug mutation. | Fixed strict locator collisions, hidden/deep-field browser access, and concatenated slug creation. |
| `admin/components/products/product-form.tsx` | Renamed basic product labels to product-specific names and removed blur-time slug mutation. | Prevented description/color/slug selector ambiguity and preserved typed slugs. |
| `admin/components/dashboard/analytics/analytics-dashboard.tsx` | Added `aria-label="Refresh analytics"` to the analytics refresh button. | Removed strict collision with global topbar Refresh. |
| `admin/components/dashboard/coupon-manager.tsx` | Made coupon save explicitly invoke `handleSubmit(onSubmit)`. | Ensured the browser Save button deterministically reaches validated submit handling. |
| `admin/lib/schemas.ts` | Treated blank optional coupon numeric fields as `undefined`. | Fixed optional `usageLimit` blank value coercing to invalid `0` and silently blocking coupon creation. |
| `client/e2e/admin-dashboard-full-browser.spec.ts` | Updated assertions/selectors for current accessible labels, exact PDP size buttons, current product card UI, backend-first product persistence, coupon total usage limit. | Made the full browser flow test the real UI contracts without strict-mode collisions or stale-list races. |
| `client/e2e/storefront-manager-visibility.spec.ts` | Waits for backend navigation persistence before asserting the table row and avoids TypeScript closure narrowing issue. | Fixed the Storefront Manager CRUD row-not-found failure and kept typecheck green. |

## Browser QA Matrix

| Feature | Admin browser | Backend verified | Storefront verified | Cleanup verified | Result |
| --- | --- | --- | --- | --- | --- |
| Admin route/control sweep | Yes | N/A | N/A | N/A | PASS |
| Category create/deep form | Yes | Yes | `/category/[slug]` heading | Yes | PASS |
| Product create | Yes | Yes | `/product/[slug]`, price, size, cart enablement | Yes | PASS |
| Coupon create/apply | Yes | Yes | Cart coupon applied message | Yes | PASS |
| Storefront Manager tabs | Yes | Yes | Public nav/collection/page/filter visibility | Yes | PASS |
| Catalogue import/export | Yes | Yes | N/A | Test fixture scoped | PASS |
| CMS homepage integration | Yes/API | Yes | Homepage, PDP, newsletter, recently viewed | Test scoped | PASS |
| Responsive coverage | Yes | N/A | 360, 390, 430, 768, 1024 widths | N/A | PASS |

## Regression Commands

| Command | Result |
| --- | --- |
| `npm run test:e2e` | PASS: 53 passed, 9 expected skips |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | PASS: server 22 tests, client 2 tests |
| `npm run build` | PASS: client, admin, server |

## Cleanup Confirmation

Mongo cleanup verification:

```json
{"categories":0,"products":0,"coupons":0}
```

Final status: PASS. The previously reported remaining e2e blockers are fixed, full browser regression passes, build/type/lint/test gates pass, and failed-run QA records were removed.
