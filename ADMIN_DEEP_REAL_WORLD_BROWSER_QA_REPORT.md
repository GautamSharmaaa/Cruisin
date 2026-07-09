# Admin Deep Real-World Browser QA Report

Date: 2026-07-06  
Project: Cruisin ecommerce admin + storefront  
Report type: second-pass deep browser QA  
Previous report preserved: `ADMIN_DASHBOARD_FULL_BROWSER_UX_CRUD_QA_REPORT.md` was not overwritten.

## Overall Result

Status: Needs Focused QA / Fixes before calling the admin dashboard fully production-pass.

I used the in-app browser against the local stack, created real `QA Deep ...` records, verified admin UI, backend API, and storefront behavior where applicable, then cleaned the QA records. I did not mark areas as pass where the browser flow was incomplete or where the UI/backend behavior showed risk.

## Environment

- Database: Mongo Docker service running.
- Seed command: `npm --workspace server run seed` passed.
- Local stack used for manual browser QA:
  - API: `http://localhost:8000`
  - Storefront: `http://localhost:3000`
  - Admin: `http://localhost:3001`
- Admin login used: seeded admin `admin@cruisin.local`.
- Browser tool: Codex in-app browser.

## QA Data Created

Created for this run:

- Category: `QA Deep Outerwear`
- Collection: `QA Deep Collection`
- Products:
  - `QA Deep Browser Jacket`
  - `QA Deep Hidden Draft Shirt`
  - `QA Deep Low Stock Pant`
- Coupons:
  - `QADEEP15`
  - `QADEEPFIXED`
- CMS:
  - `QA Deep CMS Banner`
  - `QA Deep media asset`
- Order:
  - `QA Deep Shopper`, coupon `QADEEP15`, mock Stripe payment, then admin status update to shipped.
- Catalogue:
  - Uploaded `test-fixtures/catalogues/real-cruisin-catalogue.csv` for preview/dry-run.
  - Generated a full export and parsed the downloaded CSV.

## High-Signal Findings

### 1. Product Admin Edit Loses Extra Variants

Status: Needs Focused QA / Fix

The API-created `QA Deep Browser Jacket` started with two variants. I opened it in the admin product edit UI and saved a simple short-description change. The backend product then contained only one variant.

Evidence:

- Browser edit save showed `Product updated`.
- Backend after save:
  - title: `QA Deep Browser Jacket`
  - shortDescription updated correctly
  - variants reduced to one variant

Impact:

Editing an existing multi-variant product through the current admin form can drop variants. This is not safe for real catalogue operations until the form either supports the full variant matrix or preserves untouched variants.

### 2. PDP Size Selection Did Not Enable Add-To-Cart

Status: Needs Focused QA / Fix

On `/product/qa-deep-browser-jacket`, the PDP rendered the product, image alt text, price, color, and size `S`. The main CTA remained disabled as `SELECT A SIZE` after clicking the visible size button.

Evidence:

- Size button was visible and clickable.
- CTA remained disabled after size click.
- Product-card/backend cart flow worked separately, so this appears to be a PDP selection/UI-state issue rather than product availability only.

### 3. Storefront Search Overlay Did Not Return QA Product

Status: Needs Focused QA / Fix

I opened the storefront search overlay, typed `QA Deep Browser Jacket`, and pressed Enter. The overlay accepted the text but continued showing existing analytics products instead of the QA product.

Evidence:

- Search input value became `QA Deep Browser Jacket`.
- Results shown included `QA Analytics Shorts`, `QA Analytics Jacket`, etc.
- `QA Deep Browser Jacket` was not returned.

### 4. Catalogue Confirm Import Was Not Executed

Status: Needs Focused QA

I uploaded and dry-ran the real catalogue CSV. Dry-run returned valid with 235 rows, 44 product groups, and no validation errors. I did not click/execute confirm-import because the real supplier CSV would update 44 products and 235 variants, which is broad mutation beyond scoped `QA Deep` cleanup.

Covered:

- Browser catalogue dashboard loaded.
- Upload endpoint accepted `real-cruisin-catalogue.csv`.
- Dry-run succeeded.
- Export generated.
- Downloaded CSV parsed successfully.
- Export included `QA Deep Browser Jacket` before cleanup.

Not covered:

- Full confirm-import mutation and post-import storefront regression.

## Area Results

### Admin Authentication / Shell

Status: Pass

- Opened `/login` in browser.
- Logged in with seeded admin.
- Admin shell loaded with Overview, Products, Catalogues, Categories, Storefront, Orders, Users, Discounts, CMS, Analytics.
- Topbar refresh/logout controls rendered as buttons.

### Products

Status: Partial Pass / Needs Focused QA

Passed:

- Products page loaded.
- Search/filter UI reduced product results to the QA product.
- Product edit page loaded.
- Admin save persisted short-description change.
- Public PDP rendered visible product.
- Hidden/draft product returned public not-found behavior.
- Collection/category listings rendered visible products.

Needs focused QA:

- Multi-variant preservation on admin save.
- PDP size selection and add-to-cart.
- Full real product creation through every product-form tab was not completed in-browser.

### Categories

Status: Pass for tested create/list/storefront path

- Created `QA Deep Outerwear`.
- Admin Categories showed QA category.
- Correct storefront route is `/category/qa-deep-outerwear`.
- `/category/qa-deep-outerwear` rendered the category and QA products.
- `/categories/qa-deep-outerwear` correctly was not the route.

### Collections / Storefront Manager

Status: Pass for tested collection flow

- Created `QA Deep Collection`.
- Admin Storefront Manager opened.
- Collections tab showed QA collection data.
- Mega Menu, Filters, Pages, and Settings tabs opened.
- Public `/collections/qa-deep-collection` rendered both visible QA products.

### Discounts / Coupons

Status: Pass for backend/cart/order validation; partial for browser cart UI

Passed:

- Admin Discounts showed `QADEEP15`.
- Coupon targeting listed QA products/categories.
- Cart API applied `QADEEP15`:
  - eligible subtotal: `4999`
  - discount: `749.85`
- Checkout created order with coupon.
- Mock Stripe verification marked payment paid and order confirmed.
- Analytics later showed `QADEEP15` coupon performance.

Needs focused QA:

- Browser PDP cart add is blocked by size-selection issue.
- Full browser-only cart and checkout flow should be retested after PDP CTA fix.

### Checkout / Orders

Status: Pass for API checkout + admin order management

- Added QA product to a session cart through the cart API.
- Applied `QADEEP15`.
- Created checkout with mock Stripe.
- Verified payment with local mock provider.
- Admin Orders showed QA order, item, paid status, coupon, totals.
- Admin Order Detail showed timeline and totals.
- Updated order status to `shipped` in admin UI with tracking `QA-DEEP-TRACK-001`.
- Backend confirmed:
  - `orderStatus: shipped`
  - `paymentStatus: paid`
  - timeline contained pending, confirmed, shipped.

Observation:

- Order detail status select appeared to load as `processing` while timeline/backend initially said confirmed. The controlled update still saved correctly, but the initial select state should be checked.

### CMS

Status: Pass for tested publish/render path

- Created CMS media.
- Added `QA Deep CMS Banner` section to home page.
- Published page.
- Admin CMS Builder showed QA Deep content.
- Storefront homepage rendered `QA Deep CMS Banner` and `SHOP QA DEEP`.
- Cleanup removed section, media, and the QA CMS version snapshot.

### Catalogues

Status: Partial Pass / Needs Focused QA for confirm-import

Passed:

- Admin Catalogues page loaded in browser.
- Dashboard showed import/export histories and controls.
- Uploaded real fixture CSV through API.
- Dry-run returned:
  - `canImport: true`
  - `rowCount: 235`
  - `productGroupCount: 44`
  - no validation errors.
- Generated full export.
- Downloaded export parsed:
  - line count: 306 including header
  - exported headers included Product Code, Name, Sku Id, Selling Price, MRP, Quantity, dimensions, etc.
  - CSV included QA product before cleanup.

Needs focused QA:

- Confirm import intentionally not executed for broad data-mutation safety.

### Analytics

Status: Pass for tested admin analytics visibility

- Admin Analytics loaded.
- Displayed revenue/orders/payment status/top products/top categories/top collections/coupon performance.
- QA data was reflected before cleanup:
  - `QA Deep Outerwear`
  - `QA Deep Collection`
  - `QADEEP15`

### Users

Status: Pass for read/update surface visibility only

- Admin Users loaded.
- User search/filter controls rendered.
- Role and active-state update controls rendered.
- I did not mutate real users during this QA pass.

### Storefront Search

Status: Needs Focused QA / Fix

- Overlay opened.
- Search input accepted `QA Deep Browser Jacket`.
- Result list did not return the QA product.
- `/shop?q=QA Deep Browser Jacket` also did not filter results.

### Media

Status: Pass for tested media references

- Product image and alt text rendered on PDP.
- Collection/category images rendered.
- CMS media asset was created and rendered on homepage.
- Cleanup removed the QA media record.

### Responsive

Status: Pass for tested QA collection page

Manual in-app browser viewport checks:

- `390x844`: no horizontal overflow, QA collection/product visible.
- `768x1024`: no horizontal overflow, QA collection/product visible.
- `1440x900`: no horizontal overflow, QA collection/product visible.

Automated E2E clean rerun also passed storefront responsive smoke at:

- 360px
- 390px
- 430px
- 768px
- 1024px

### Security / Access Control

Status: Pass for tested basics

- Unauthenticated admin coupons endpoint returned `401`.
- Hidden/draft product public API returned `404`.
- Escaped admin product search query for `<script>` returned success with zero matches.
- Invalid coupon request without cart returned `400` and did not leak data.

## Cleanup

Cleanup executed with direct app models and then verified via API while the stack was running.

Deleted:

- Products: 3
- Categories: 1
- Collections: 1
- Coupons: 2
- CMS sections: 1
- CMS media: 1
- CMS versions containing QA Deep snapshot: 1
- Orders: 1
- Catalogue imports: 1
- Catalogue exports: 1

Verification after cleanup:

- Admin product search for `QA Deep`: total `0`
- Admin categories with `QA Deep`/`qa-deep`: `0`
- Admin collections with `QA Deep`/`qa-deep`: `0`
- Admin coupons with `QADEEP`: `0`
- Public product `qa-deep-browser-jacket`: `404`
- Public collection `qa-deep-collection`: `404`
- Public category path `qa-deep-outerwear`: `404`

## Regression Commands

Passed:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
  - server: 6 files, 22 tests passed
  - client: 1 file, 2 tests passed
- `npm run test:e2e` after clean rerun:
  - 25 passed
  - 5 skipped

Note:

The first E2E attempt was invalid because the manual dev stack was still using ports 3000/3001, and generated `.next` artifacts were stale after build/dev switching. I stopped the manual stack, cleared `client/.next` and `admin/.next`, reran E2E, and the clean run passed.

## Final Recommendation

Do not call the admin dashboard fully production-pass yet. The broad admin/storefront skeleton is strong, and many CRUD/merchandising paths work, but these need focused fixes before a final pass:

1. Preserve all variants when saving an existing product in admin.
2. Fix PDP size selection so add-to-cart enables correctly.
3. Fix storefront search to return matching products.
4. Execute a scoped confirm-import catalogue test with a small QA-only CSV.
5. Re-check order-detail initial status select value against backend status.
