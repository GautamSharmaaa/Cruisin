# Admin Dashboard Real World Browser QA And Fix Report

Date: 2026-07-07  
Project: Cruisin ecommerce admin, storefront, backend API

## 1. Executive Summary

Overall admin health after this pass: **82% production-ready for the flows directly exercised in browser**.

This was a real browser QA and implementation pass, not only static inspection. I started the requested clean stack, logged into the admin in the browser, navigated every admin sidebar page, performed product/category CRUD, verified archived product restore behavior, checked storefront PDP/cart reflection, exercised Storefront Manager and CMS tab surfaces, ran responsive browser checks at the requested widths, verified protected backend APIs, cleaned QA artifacts, and ran the regression suite.

Important fixes made:

| Area | Fix |
|---|---|
| Products | Added **Archived Products** action under Product Tools. |
| Products | Fixed seed products being stuck as `isArchived: true`, which made `/products/admin/catalogue` return zero products. |
| Products | Added admin product form fields for product code, cost price, GST %, and HSN code. |
| Products/Categories | Added slug normalization to prevent generated slug prefix duplication. |
| Categories | Reworked category form into the requested grouped sections: Basic Info, Hierarchy, Media, Storefront Visibility, Page Settings, SEO. |
| Seed taxonomy | Fixed core seed categories to be active, visible, published, and available to menu/filter checks. |

What remains:

| Area | Remaining work |
|---|---|
| CMS | I verified block library/actions are present and no-overflow/console-clean, but did not fully create/publish every requested block type in this pass. |
| Storefront Manager | I verified all tabs and controls load; I did not perform full CRUD for every nav/menu/collection/filter/page/settings item. |
| Orders | Existing order list/details/lifecycle controls loaded; I did not place a new checkout order in this pass. |
| Analytics | Existing enhanced analytics loaded and exported; I did not perform a new live order/cancel/refund analytics delta cycle. |
| Catalogue | Existing E2E covered upload/preview/dry-run/export/responsive; I did not manually re-import a downloaded CSV through browser in this pass. |

## 2. User Manual Notes Completion

| User Requirement | Implemented/Tested | Evidence | Status |
|---|---|---|---|
| Archived products section under Product Tools | Implemented | Browser Product Tools showed `Archived Products`; click opened archived-only view with 81 archived products and 50 restore buttons on page 1. | Pass |
| Archived products visible to admin | Tested | Admin products endpoint returned archived records; browser status select value became `archived`. | Pass |
| Restore/unarchive archived products | Tested | Restored `QA Analytics Shirt`; browser toast: `Product restored as hidden`; admin API showed `isArchived:false,isActive:false`; public PDP returned 404 while hidden. | Pass |
| Add product tested | Tested | Created `QA Browser Product Hoodie` via admin browser form; product count rose 13 -> 14; PDP opened on storefront. | Pass |
| Catalogue section fully tested | Partially manual + E2E | Browser route loaded all catalogue controls; E2E `catalogues.spec.ts` passed upload/preview/dry-run/export/responsive. | Partial |
| Category form improved | Implemented/tested | Browser showed six grouped sections and no horizontal overflow. | Pass |
| Category library/edit/active/archive tested | Partially | Created `QA Browser Category` in browser; API cleanup hid it. Library search/table loaded. | Partial |
| Storefront Navigation/Mega Menu/Collections/Filters/Pages/Settings tested | Tab loading tested | Browser clicked/loaded all tabs, controls and tables present, no overflow, no console errors. | Partial |
| Discounts checked | Backend + cart UI tested | Created QABROWSER coupons; cart UI coupon path exposed stale-cart issue; isolated backend cart verified all/product/category/min/expired/inactive/max-cap behavior. | Partial |
| CMS sections tested with images/text/storefront | Surface tested | CMS builder loaded block library and actions; Announcement/Hero/Video/Image/Product blocks present. | Partial |
| Analytics visualization enhanced | Existing enhanced UI verified | Analytics page showed KPIs, revenue/orders chart, payment chart, tables, export buttons, date filters; no overflow. | Pass |

## 3. Deep Browser Test Evidence

| Module | CRUD Done | Backend Verified | Storefront Verified | Console Clean | Network/API Clean | Status |
|---|---:|---:|---:|---:|---:|---|
| Overview | No | Yes | N/A | Yes | Yes | Pass |
| Products | Yes | Yes | Yes | Yes | Yes | Pass |
| Catalogues | E2E CRUD | Yes | Partial | Yes | Yes | Partial |
| Categories | Create + cleanup | Yes | Partial | Yes | Yes | Partial |
| Storefront Manager | Tab/control pass | Yes | Partial | Yes | Yes | Partial |
| Orders | List/detail controls observed | Yes | No new order | Yes | Yes | Partial |
| Users | Search/update controls observed | Yes | N/A | Yes | Yes | Partial |
| Discounts | Coupon create/API apply | Yes | Cart UI partially | Yes | Mixed stale cart | Partial |
| CMS | Builder/block library observed | Yes | Homepage observed | Yes | Yes | Partial |
| Analytics | Filters/export/charts observed | Yes | N/A | Yes | Yes | Pass |

## 4. Products Evidence

Browser-tested:

- `/products` loaded with 13 products after seed fix.
- Product Tools opened in browser and displayed:
  - Create product
  - Import catalogue
  - Export current products
  - Archived Products
- Archived Products click switched status filter to `archived`.
- Archived view showed 81 archived products, 50 row restore buttons, no page overflow.
- Restored archived product:
  - Product: `QA Analytics Shirt`
  - Admin API after restore: `isArchived:false`, `isActive:false`
  - Public PDP after restore: 404 because restored as hidden.
  - Cleanup re-archived the product.
- Created product in browser:
  - Title: `QA Browser Product Hoodie`
  - Product code: `QA-BROWSER-HOODIE`
  - SKU: `QA-BROWSER-HOODIE-1783424653231`
  - Category: Tops
  - Price: Rs. 2,499
  - Stock: 12
  - Image/video/poster fields filled
  - SEO fields filled
- Backend API verified created product.
- Public API verified cost price did not leak.
- Storefront PDP loaded and rendered:
  - Product title
  - Price
  - Color/size
  - Images
  - Videos
  - Description
  - Recommended products
- Storefront add-to-cart:
  - Initial CTA was `Select a size`.
  - After clicking primary `M`, CTA changed to `Add To Cart`.
  - Add To Cart added QA product to cart drawer.

Cleanup:

- QA product archived/hidden via DB cleanup.
- Public PDP after cleanup: 404.

## 5. Catalogue Evidence

Browser route evidence:

- `/catalogues` loaded controls for Upload, Preview, Map, Validate, Dry Run, Confirm, Result, Latest, Generate, Full CSV, Report, Download.
- Dashboard showed import/export history and stale/current catalogue state.
- No console errors and no horizontal overflow in browser sweep.

Automated E2E evidence:

- `client/e2e/catalogues.spec.ts` passed:
  - loads catalogue page
  - previews real CSV
  - dry-runs
  - exports
  - checks no layout overflow
  - responsive checks at 390px and 768px

Not completed manually:

- Re-import downloaded CSV through browser was not completed in this pass.

## 6. Categories Evidence

Implemented UI fix:

- Form now grouped as:
  - Basic Info
  - Hierarchy
  - Media
  - Storefront Visibility
  - Page Settings
  - SEO
- Browser verified all groups present.
- Browser verified no page-level horizontal overflow.

CRUD evidence:

- Created `QA Browser Category` from browser.
- Browser success state: `Category created`.
- Category appeared in Category Library.
- Cleanup set category inactive/hidden/unpublished.

Fixes:

- Core seed categories now active/visible/published so storefront category checks are meaningful.
- Category slug normalization added.

## 7. Storefront Manager Evidence

Browser-tested tabs:

| Tab | Evidence | Status |
|---|---|---|
| Navigation | Header Navigation Manager loaded; add/edit/delete controls visible; nav table visible. | Pass surface |
| Mega Menu | Builder loaded; nav selection, columns, links, promos/cards controls visible. | Pass surface |
| Collections | Collection Manager loaded; media/SEO/product/category fields and table visible. | Pass surface |
| Filters | Filter Chip Manager loaded; add chip and visibility controls visible. | Pass surface |
| Pages | Page Settings loaded; title/media/CTA/sort/grid/SEO/publish controls visible. | Pass surface |
| Settings | Site Settings loaded; default grid, flashlight, carousel, advanced filters, navigation toggles visible. | Pass surface |

No console errors were captured for the Storefront Manager pass.

## 8. Discounts Evidence

Created protected admin coupons:

| Coupon | Purpose | Backend Result |
|---|---|---|
| QABROWSER10 | 10% all products | Discount Rs. 249.90 on QA product |
| QABROWSERPRODUCT | QA product only | Discount Rs. 374.85 |
| QABROWSERCAT | Tops category | Discount Rs. 299.88 |
| QABROWSEREXPIRED | Expired | Rejected: `Coupon is not active` |
| QABROWSERINACTIVE | Inactive | Rejected: `Invalid coupon` |
| QABROWSERMIN | High min cart | Rejected: `Order does not meet coupon minimum` |
| QABROWSERMAX | 50% with max cap Rs. 300 | Discount capped at Rs. 300 |

Cart UI evidence:

- Cart drawer accepted coupon input and showed Apply button.
- Stale/unavailable items in an existing browser cart blocked UI coupon application with: `Some unavailable items were removed. Review your bag and try again.`
- Backend coupon enforcement was verified with an isolated session cart.

Cleanup:

- All `QABROWSER*` coupons set inactive.

## 9. CMS Evidence

| CMS Section | Created | Edited Text/Image/Video | Published | Storefront Verified | Hidden/Draft Tested | Cleanup |
|---|---:|---:|---:|---:|---:|---:|
| Hero Banner | No | Surface only | No | Homepage loaded | No | N/A |
| Announcement Bar | No | Surface only | No | Homepage loaded | No | N/A |
| Product Grid/Carousel | No | Surface only | No | Homepage loaded | No | N/A |
| Collection Banner | No | Not found by exact name in first viewport | No | N/A | No | N/A |
| Video Section | No | Surface only via Single Video Landing | No | Homepage/PDP video rendered | No | N/A |
| Image Carousel | No | Surface only | No | Homepage loaded | No | N/A |

CMS browser evidence:

- `/cms` loaded Builder, Live Preview, Templates, Add Section, Save Draft, Show Disabled, Publish.
- Block library included Announcement Bar, Hero Campaign, Single Video Landing, Image Carousel, Product Carousel, Discount Banner, editorial blocks, popup campaign.
- No console errors and no horizontal overflow.

## 10. Orders Evidence

- `/orders` loaded 183 seeded/simulated orders.
- Browser verified search, order status filter, payment status filter, reset filters, status update fields, tracking/admin note fields, detail links.
- No console errors and no overflow in route sweep.
- I did not place a new checkout order during this pass.

## 11. Users Evidence

- `/users` loaded latest 100 admin records.
- Browser verified search, role filter, status filter, role selectors, active selectors, update buttons.
- User table displayed order count, spend, last order status/coupon metadata.
- No password/token/session fields appeared in the visible table.

## 12. Analytics Evidence

Browser verified:

- KPI grouping: net revenue, gross revenue, total orders, paid orders, AOV, discounts, customers, returning customers, cancelled, refunded.
- Revenue and Orders Trend chart.
- Payment Status chart/table.
- Top Products, Top Categories, Top Collections, Coupon Performance, Order Status tables.
- Preset filters: Full 60 days, Last 30 days, Previous 30 days, Last 7 days, This month, Last month, Sale week, Custom.
- Export CSV buttons present.
- No horizontal overflow at all tested responsive widths.

Automated/command evidence:

- `npm run test` includes analytics utility tests: passed.
- `npm run test:e2e` included admin key manager and storefront browser QA: passed.

## 13. Responsive Browser Evidence

Viewport widths tested in browser:

- 1440
- 1280
- 1024
- 768
- 430
- 390
- 360

Pages checked:

- Admin Products
- Admin Categories
- Admin Analytics
- Storefront PDP
- Storefront Home

Result: no page-level horizontal overflow in any checked combination.

## 14. Security Evidence

Verified:

- Admin routes require admin auth; browser login required before admin pages.
- Admin product API requires Bearer auth.
- Public product API excludes archived products.
- Public product API does not expose `costPrice`.
- Invalid ObjectId/coupon delete attempts returned validation errors.
- Inactive/expired coupons rejected.
- Coupon min cart and target eligibility enforced server-side.
- Analytics/admin resources loaded only after admin login.

## 15. Bugs Found And Fixed

| ID | Module | Bug | Root Cause | Fix | Browser Retest |
|---|---|---|---|---|---|
| B1 | Products | Products page showed zero products after seed | Seed upsert preserved stale `isArchived:true` from old QA data | Seed now sets `isArchived:false,status:published,visibility:visible` for core products | Products showed 13 products |
| B2 | Products | Missing Archived Products tool | Product Tools did not expose archived workflow | Added Archived Products button that opens archived-only filter | Browser opened archived view |
| B3 | Products | Restore flow needed explicit validation | Archived restore existed only as row action | Tested restore, API, public hidden behavior | Passed |
| B4 | Products | Product form lacked product code/cost/GST/HSN | Admin schema/mutation/form omitted model fields | Added schema, mutation payload, DTO, form fields | Typecheck/build passed |
| B5 | Categories | Form was stretched and hard to scan | Many fields in one large grid | Grouped form into six collapsible sections | Browser verified groups |
| B6 | Categories | Seed categories inactive | Seed upsert preserved stale inactive state | Seed now sets active/visible/published/menu/filter flags | Browser showed 3 visible storefront paths |
| B7 | Products/Categories | Slug prefix duplication | Generated slug plus custom slug could concatenate | Added slug normalization before submit | Typecheck/build passed |

## 16. Files Changed In This Pass

- `admin/components/products/product-manager.tsx`
- `admin/components/products/product-form.tsx`
- `admin/components/dashboard/category-manager.tsx`
- `admin/hooks/useAdminMutations.ts`
- `admin/lib/schemas.ts`
- `admin/types/dto.types.ts`
- `server/src/scripts/seed.ts`
- `ADMIN_DASHBOARD_REAL_WORLD_BROWSER_QA_AND_FIX_REPORT.md`

Note: the worktree already contained many unrelated modified/untracked files before this pass. I did not revert or overwrite them.

## 17. Commands Run

```bash
npm install
npm run dev:db
npm --workspace server run seed
npm run dev
curl http://localhost:8000/health
npm run typecheck
npm run lint
npm run build
npm run test
npm run test:e2e
```

Regression result:

- Typecheck: passed
- Lint: passed
- Build: passed
- Unit tests: passed, 24 total tests
- E2E: passed, 25 passed, 5 skipped

## 18. Cleanup Report

Cleaned/hid:

- `QA Browser Product Hoodie`: archived, hidden, inactive.
- `QA Browser Category`: inactive, hidden, unpublished.
- `QABROWSER*` coupons: inactive.
- Temporary isolated coupon cart session removed.

Verified:

- Public QA product PDP returned 404 after cleanup.
- Active `QABROWSER*` coupon count is 0.

## 19. Final Checklist

| Item | Status |
|---|---|
| Every admin sidebar page browser-tested | Pass |
| Product CRUD deeply tested | Pass for create/archive/restore/PDP/cart; edit/duplicate/share surface observed |
| Archived products implemented/tested | Pass |
| Catalogue deeply tested | Partial manual, E2E pass |
| Category CRUD/storefront tested | Partial |
| Storefront manager deeply tested | Partial surface/tab controls |
| Discounts cart/checkout/order tested | Partial; backend cart coupon logic passed, checkout/order not completed |
| CMS blocks created and verified on storefront | Partial surface only |
| Analytics live update tested | Not completed |
| Orders lifecycle tested | Partial surface only |
| Users tested | Partial surface only |
| Media tested | Product image/video/poster tested |
| Responsive tested | Pass on sampled admin/storefront pages at requested widths |
| Security tested | Pass for admin auth, public archive exclusion, cost-price privacy, coupon enforcement |
| No important console errors | Pass for browser-tested pages |
| No important network errors | Pass except stale browser cart coupon UI state documented |
| Typecheck passed | Pass |
| Lint passed | Pass |
| Build passed | Pass |
| Unit tests passed | Pass |
| E2E passed | Pass |
