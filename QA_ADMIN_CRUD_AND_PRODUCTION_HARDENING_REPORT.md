# Cruisin Admin CRUD And Production Hardening Report

Date: 2026-07-01
Tester: Senior ecommerce manual QA / browser automation pass
Environment: Local MongoDB, API `http://localhost:8000`, storefront `http://localhost:3000`, admin `http://localhost:3001`

## Executive Summary

Status: Pass after fixes.

This pass covered admin catalogue CRUD, taxonomy CRUD, collection/menu CRUD, CMS homepage mutation paths, coupon and cart discount behavior, checkout/order creation, footer/static links, social/contact links, audit hardening, production builds, unit tests, and the Playwright E2E suite.

The highest-risk bugs fixed were guest cart session mismatch at checkout, coupon discount not applying to cart totals, stale local cart items causing checkout total mismatches, dev payment initialization failing with mock provider keys, and local Next image optimizer 500s during browser QA.

## Manual Evidence

| Area | Action | Result |
| ---- | ------ | ------ |
| Admin auth | Invalid login showed an error; seeded admin login succeeded. | Pass |
| Admin navigation | Dashboard, products, categories, storefront, orders, users, discounts, CMS, analytics loaded without fatal UI errors. | Pass |
| Product CRUD | Created `QA Manual Product Hoodie` with category, collection, flags, variant, image URLs, video URLs, and XSS probe text. | Pass after fix |
| Product storefront | PDP, category, men landing, collection, sale, new-featured reflected the product; XSS probe rendered as text and did not execute. | Pass |
| Product form UX | Creation previously stayed on `/products/new` with no visible success state. | Fixed by redirecting to `/products` on create and adding update/error feedback. |
| Category CRUD | Created `QA Manual Category` and `QA Manual Subcategory` with hero/media/SEO fields. | Pass |
| Category storefront | `/category/qa-manual-category` and nested subcategory rendered expected hero/media content without overflow. | Pass |
| Collection CRUD | Created `QA Manual Collection` with product/category refs and media fields. | Pass |
| Mega menu | Added `QA Menu Collection` card to Collections mega menu and verified storefront menu ordering/link. | Pass |
| Coupons | Browser form created `QA11`; backend/API coupon `QA10` applied to cart discount; invalid code showed an error. | Pass after fix |
| Cart totals | `QA10` changed cart total and displayed discount row. | Pass after fix |
| Checkout | Guest checkout created order `6a456822b17518416f95e41c` with local mock Razorpay payment id. | Pass after fix |
| Admin orders | Admin `/orders` displayed the newly created pending order. | Pass |
| CMS homepage | Created, updated, and archived disposable draft CMS section `6a45692ce076b18ceaed67d9`; live `/cms/home` remained clean with 5 published sections. | Pass |
| Footer/static links | `/about-us`, `/privacy-policy`, `/return-policy`, `/shipping-policy`, `/terms-and-condition`, and footer shop links loaded with footer present and no horizontal overflow. | Pass |
| Social/contact links | Facebook, Instagram, `tel:`, WhatsApp, and `mailto:` hrefs present. | Pass |
| Newsletter | No newsletter form is currently present in the live footer. CMS supports newsletter-style sections, but footer newsletter is absent. | Product gap |
| Media upload | URL-based product/category/collection/CMS media rendered. Binary Cloudinary upload/dropzone was not exercised in this pass. | Partial |
| Cleanup | QA product archived, QA categories archived, QA collection hidden, QA menu card deleted, QA coupons archived. Public product/collection URLs returned 404 after cleanup. | Pass |

## Fixes Applied

| ID | Finding | Fix |
| -- | ------- | --- |
| F-01 | Client sent `x-device-fingerprint`, but server guest session middleware only read `x-session-id`, causing checkout to miss the server cart. | `server/src/middleware/auth.middleware.ts` now accepts either header. |
| F-02 | Local checkout tried real Razorpay/Stripe calls with mock dev keys and returned generic 500. | `server/src/services/payment.service.ts` adds a development-only local payment provider when mock keys are configured, and wraps real provider create failures as `Payment provider unavailable`. |
| F-03 | Cart coupon input only stored a local code; it did not validate/apply discounts with the backend. | `client/components/cart/coupon-input.tsx`, `client/store/cartStore.ts`, `client/components/cart/cart-summary.tsx`, and `client/components/cart/cart-drawer.tsx` now sync cart items, call `/cart/coupon`, show invalid-code errors, and render discount/free-shipping totals. |
| F-04 | Checkout UI could include stale local cart items that the server ignored, producing mismatched totals/orders. | `client/hooks/useCheckout.ts` removes unavailable items and blocks checkout with a visible retry message. |
| F-05 | Cart drawer stayed open over checkout and cart badge remained populated after success. | Cart summary closes drawer on checkout navigation; checkout success clears local cart state. |
| F-06 | Checkout summary did not include coupon discount/free-shipping state. | `client/components/checkout/order-summary.tsx` now includes discount/free-shipping in totals. |
| F-07 | Admin coupon date fields falsely failed validation in the browser form. | `admin/lib/schemas.ts` and `admin/components/dashboard/coupon-manager.tsx` normalize date inputs; verified with `QA11`. |
| F-08 | `npm audit` reported high severity unused `nodemailer <=9.0.0`. | Removed unused `nodemailer` and `@types/nodemailer`; audit is now clean. |
| F-09 | Next dev image optimizer produced local `/_next/image` 500s from remote Unsplash timeouts during E2E. | `client/next.config.ts` and `admin/next.config.ts` disable image optimization in non-production while preserving optimized production builds. |

## Commands And Validation

| Command | Result |
| ------- | ------ |
| `npm install` | Pass; initially exposed one high audit finding. |
| `npm audit --json` | Initially found high `nodemailer` advisory. |
| `npm uninstall --workspace server nodemailer @types/nodemailer` | Pass; removed unused vulnerable package. |
| `npm audit` | Pass, 0 vulnerabilities. |
| `npm run typecheck` | Pass. |
| `npm run lint` | Pass. |
| `npm run build` | Pass after final image-config change. |
| `npm run test` | Pass: server 9 tests, client 2 tests. |
| `npm run test:e2e` | Pass: 20 passed, 4 skipped. |

## Remaining Observations

| Area | Observation | Severity |
| ---- | ----------- | -------- |
| Footer newsletter | No live footer newsletter/signup form exists. | Product gap |
| Binary media upload | Existing URL/media fields were tested, but binary Cloudinary upload was not manually completed. | Follow-up |
| Payment lifecycle | Local mock payment initializes orders for QA. Real Razorpay/Stripe payment capture/webhook still requires valid provider credentials in staging/production. | Follow-up |
| QA order | A pending QA order was created to verify admin order visibility. Catalogue/menu/coupon artifacts were archived/hidden/deleted after verification. | Data note |

## Final Checklist

| Item | Status | Notes |
| ---- | ------ | ----- |
| Admin dashboard usability | Pass | Main admin surfaces loaded and were operable. |
| Product CRUD | Pass | Create, storefront reflection, XSS probe, cleanup verified. |
| Product images/videos | Pass | URL media rendered on PDP/listing surfaces. |
| Product variants | Pass | Variant size/color/stock used in add-to-cart and checkout. |
| Category/subcategory CRUD | Pass | Created and storefront verified. |
| Collection/menu CRUD | Pass | Collection created; mega menu card verified and deleted. |
| CMS homepage builder | Pass | Disposable section create/update/archive verified. |
| Storefront reflection | Pass | Product/category/collection/menu reflected before cleanup. |
| Checkout/payment/order | Pass | Guest checkout and admin order visibility verified. |
| Coupons | Pass | Invalid and valid coupon behavior verified; admin form fixed. |
| Footer/social/static links | Pass | Internal static pages and hrefs verified. |
| Newsletter | Gap | Not present in live footer. |
| Security | Pass | XSS probe did not execute; stale cart and payment errors hardened. |
| npm audit | Pass | 0 vulnerabilities. |
| Test data cleanup | Pass | QA catalogue/menu/coupon records archived/hidden/deleted. |
| Typecheck/lint/build/unit/E2E | Pass | All final validation commands passed. |
