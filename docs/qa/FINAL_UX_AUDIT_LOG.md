# Cruisin Final UX Audit Log

Audit window: 2026-07-12 through 2026-07-13, Asia/Kolkata. Secrets and credential values are intentionally omitted.

## Environment gate

- Branch `main`; baseline commit `ad1cb4272d7159e6d6d1ed00e7cc20d256d1baaf`.
- Existing dirty-tree audit work was preserved; no reset, stage, commit, push, deployment, or DNS action occurred.
- Local MongoDB 7 / database `cruisin`, local API, storefront, and Admin were used exclusively.
- Payment classification remained Razorpay Test Mode. Existing capture/refund evidence was preserved and no new provider refund or public webhook test was attempted.
- Final artifacts return HTTP 200 at storefront `/`, Admin `/`, API `/health`, and API `/ready`.

## Discovery and baseline

- Discovered and inventoried 34 storefront routes and 14 Admin routes.
- Reviewed the historical `TEST_MATRIX`, bug register, production audit log, production-readiness documents, and prior screenshots as historical—not current—evidence.
- Captured baseline Analytics, product variant editor, PDP, and homepage screenshots before the material visual/interaction changes.

## Product variants and storefront filters

- Created `QA-VARIANT-LUXURY-TEE` through Admin with Black `#050505`, White `#FFFFFF`, Burgundy `#800020`, and later Navy `#000080` combinations.
- Verified 15 persisted variants: Black/White/Burgundy S–XL, White/L sold out, and Navy S/M/L sold out. Burgundy/XL uses the variant price ₹2,099; other combinations use ₹1,999.
- Verified color-specific galleries, natural size order, disabled stock-zero sizes, selected-state/focus semantics, exact displayed SKU/stock/price, and selection reset when colors change.
- Fixed backend color+size filtering to require the same variant element. Verified Black+M, White+XL, category combinations, zero results, direct URL, clear-one/clear-all, desktop/mobile agreement, and dynamic facets that exclude archived products.
- Verified separate cart lines for exact variants and exact White/M plus Burgundy/XL order data in storefront, Admin, API, and MongoDB.

## Catalogue

- Added `Colour HEX`, `Variant Image URLs`, and `Variant Enabled` to import/export and lossless variant round trips.
- Valid fixture: 6 rows, 2 products, 6 variants, 0 errors. Confirm import created/updated exact SKU/color/size/stock/image/enabled data; repeat confirmation updated without duplicates.
- Invalid fixture: 4 physical rows, 7 blocking validation issues and 2 warnings; history now immediately records `failed` with completion time instead of misleading `pending`.
- Export/re-import dry run preserved all six variants and formula-safe CSV cells.
- The real 235-row/44-product legacy catalogue initially failed because it predates `Colour HEX`. The final parser infers deterministic HEX values only when the column is absent/blank, emits 44 explicit warnings, and still rejects malformed supplied values. Final result: 0 errors, confirm enabled.
- The in-app Browser cannot populate a native local file chooser. The same real upload was exercised by Playwright `setInputFiles`; QA upload/confirm/export used the real API and was verified in the visible Admin history. This is `BROWSER-LIM-001`, not an application failure.

## Analytics

- Reconciled the last-30-day IST range `2026-06-14` through `2026-07-13` independently from MongoDB and the API.
- Exact agreement: 22 orders, 3 paid, ₹106,599 gross merchandise subtotal, ₹121,762 collected net total after refunds, ₹6,725 refunds, 7 units, 4 customers, 3 new, 3 returning, and ₹74,117 COD outstanding.
- Net may exceed merchandise gross because net is collected order total (including eligible tax/shipping) after refund, while gross is merchandise subtotal; the definitions are labeled in the UI and were intentionally preserved.
- Rebuilt Analytics with 10 defined KPI cards, previous-period context and inverse semantics, Today/7/30/90/custom ranges, refresh/export, trends, payment/order/customer/refund/inventory charts, ranked tables, textual summaries, responsive containers, and polished loading/empty/error states.
- CSV download was parsed in the focused browser regression and matched the Today API values for net revenue, order count, and refunds.

## Manual Browser sweeps

- Storefront: every discovered route was opened at desktop, tablet, and mobile classes. Major layouts and overlays were additionally exercised at all required boundary widths: 1440, 1280, 1024, 768, 430, 390, and 360 pixels.
- Guest: navigation, search variations, filters, PDP, cart mutation, invalid/valid/remove coupon, wishlist prompt, checkout prompt, return URLs, focus/Escape, and “no order/payment” checks passed.
- Registration/login: empty/invalid/weak/mismatch/existing/repeated submit/loading, valid registration, test verification, unknown/wrong/valid login, cart merge/preservation, refresh, logout/back, route protection, and simultaneous Admin/customer sessions passed.
- Customer: wishlist persistence/removal, profile routes, address add/edit/default, exact checkout summary, safe COD success, orders/detail, 403 cross-customer order, empty states, security/session view, and account deletion passed.
- Admin: login/logout/protected redirects; overview; products/create/edit/variant matrix; categories; all six Storefront Manager tabs; orders/detail; users/detail; discounts; CMS draft/live preview/publish/version UI; catalogue; and Analytics all passed. Mobile route/menu/detail sweeps passed without page-level overflow.

## Notable interaction/UI fixes

- Raised drawer/modal layers above the sticky header; guest wishlist and checkout prompts now remain visible and usable.
- Replaced nested button/link structures with semantic links; added dynamic wishlist accessible labels and pressed state.
- Added removable/loading-safe coupons, exact checkout line-item SKU/color/size/image data, and address edit/cancel/update UX.
- Made the CMS homepage dynamic so publishing changes the live storefront without a rebuild; published QA content was later deleted and republished cleanly.
- Prevented empty search/Admin CMS product queries from sending 400s.
- Made nonproduction email sending a no-op and production registration compensate/clean up on provider failure, preventing ghost accounts.
- Added an unavailable-product recovery state, branded media fallback, strict product query validation, and deterministic invalid catalogue status.

## Security and failure checks

- Passed: customer→Admin API 403, cross-customer order 403, invalid ID 400, negative/decimal quantity 400, stock-zero variant 409, malformed JSON 400, literal XSS query safe/empty, operator-shaped product query 400, logout route protection, and no guest order/payment side effect.
- Automated retryable API outage, broken media fallback, branded 404, serious WCAG gate, cross-browser, responsive overflow, and local performance budgets passed.

## Final regression and cleanup

- Unit/service: 79 server + 13 storefront + 13 Admin = 105 passed.
- Full Playwright: 52 passed, 3 conditional skips, 0 failed across Chromium, mobile Chromium, Firefox, and WebKit. The skips are unpublished newsletter/recently-viewed modules and the desktop-project mobile-menu case covered by the dedicated mobile project.
- Typecheck and lint passed in all three workspaces. Final production builds passed. `npm audit --omit=dev` found 0 vulnerabilities.
- Post-build restart: storefront/Admin/API/MongoDB/Redis ready; Chromium production-artifact smoke 3/3 passed.
- QA CMS section removed and homepage republished; coupon inactive; QA category inactive; QA collection/filter hidden; three QA products archived; no-order QA customer deleted; final catalogue regenerated as Current with 292 production rows. The QA order remains with exact embedded variant evidence.

## Final condition

Application result: no open critical/high application defect. Release result: **CONDITIONAL GO** pending `EXT-WEB-001` and the deployment-day production checklist.
