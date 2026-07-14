# Cruisin Final Production QA Report

Audit completed: 2026-07-12 (Asia/Kolkata)  
Repository baseline: `main` at `ad1cb4272d7159e6d6d1ed00e7cc20d256d1baaf`  
Scope: Storefront, Admin, API, MongoDB, Redis readiness, authentication,
authorization, cart, orders, inventory, Razorpay, refunds, analytics, CMS,
catalogues, security, accessibility, performance, SEO, failure states, and deployability.

## Recommendation

**CONDITIONAL GO.**

Genuine Razorpay Test payments and processed partial/full refunds now pass and
all confirmed application defects are resolved. Production traffic remains
conditional on one external deployment prerequisite: authenticate to the matching
Razorpay Dashboard, register the final public HTTPS webhook URL, and retain proof
of actual Test Dashboard delivery. Local signed replay is not represented as
provider delivery.

## Executive findings

- Local production artifacts build and run for all three workspaces.
- Authentication, session isolation, object authorization, pricing, order state,
  inventory, checkout idempotency, settlement concurrency, CSV safety, readiness,
  SEO, accessibility, and failure-state defects were found, fixed, and regressed.
- COD was proven through UI/API/DB/Admin: order `CR-MRGFJI0N-GU4U8` moved from
  ₹41,654 paid 0/due 41,654 to paid 41,654/due 0 with consistent customer/Admin views.
- Razorpay Test Mobikwik completed two captured payments: ₹23,202
  (`pay_TCTI9fqH0FyFTR`) and ₹1,725 (`pay_TCTfTED4bKKzuR`). Both signatures were
  verified and both orders reconciled to one attempt/decrement, paid/due totals,
  cleared cart, and matching customer/Admin views.
- Provider partial refund `rfnd_TCTYkvLAS96EdH` processed ₹5,000. Fresh-capture
  full refund `rfnd_TCTgePbxEheptX` processed ₹1,725 and the payment became fully
  refunded. Both are visible in API/DB/storefront/Admin and analytics.
- UPI remained absent, while card OTP and netbank test handoffs had stalled.
  Checkout imposed no method restriction and CSP/key/currency/contact settings
  were correct. An available Test wallet succeeded, classifying the original
  blockage as method/provider-simulator availability rather than Cruisin code.
- Analytics was independently reconciled using batch
  `ANALYTICS_QA_BATCH_20260702181816` over full-60-day, last-7-day, prior-month,
  and sale-week ranges before its UI was enhanced.

## Manual browser evidence

The Codex in-app browser was used for manual evidence, distinct from Playwright.

- Storefront: homepage/menu/search, listings, sort/grid, PDP/variants/gallery,
  wishlist prompt, cart/coupon, authenticated account routes, address CRUD,
  checkout/COD, order history/detail, Razorpay Test failure/dismissal/retry,
  legal/not-found/loading/empty/broken-image states, and responsive 390/768 layouts.
- Admin: login/direct routes, overview, products, categories, storefront manager,
  orders, users, discounts, CMS, catalogues, Analytics, responsive tables/drawers,
  and storefront reflection/cleanup.
- Authorization batch `QA-AUTHZ-20260711132652`: other-customer order 403,
  customer admin/refund 403, owner 200, admin allowed, evil refresh Origin 403.
- Checkout idempotency browser record `CR-MRGPIY2U-RA1TV`: two identical
  submissions after dismissal; DB count 1, one attempt key, one provider order.

## Automated evidence

| Gate | Result |
|---|---|
| Server Vitest | 12 files, 72 tests passed |
| Client Vitest | 3 files, 7 tests passed |
| Admin Vitest | 1 file, 10 tests passed |
| Payment/order focused | 28 passed across order checkout/refund and provider primitives, included in server count |
| Typecheck/lint scripts | All workspaces passed |
| Production builds | Storefront, Admin, API passed |
| Playwright | 52 passed, 3 NA skips, 55 total: desktop Chromium full; mobile Chromium, Firefox, WebKit supported smoke |
| Payment-scoped Chromium rerun | Admin production-artifact suite 3/3 passed |
| Accessibility | 5 critical surfaces, no serious/critical axe violations |
| Dependency audit | 0 production and 0 complete vulnerabilities |

The two skips are the newsletter and recently-viewed homepage modules, which are
not present in the currently published three-section CMS page; the desktop-only
menu test is skipped in the desktop project because mobile navigation is covered
by the explicit mobile/cross-browser contract. These are classified NA, not NT.

## Performance evidence

Measured against local production artifacts after Mongo/Redis recovery:

| Route | TTFB | FCP | LCP | CLS | Transfer |
|---|---:|---:|---:|---:|---:|
| `/` | 2ms | 48ms | 136ms | 0 | 2016KB |
| `/shop` | 2ms | 36ms | 220ms | .0011 | 586KB |
| `/product/void-drape-hoodie` | 4ms | 56ms | 128ms | 0 | 429KB |

The first performance attempt exposed a real infrastructure failure: Docker had
been paused. `/health` stayed 200 while data calls timed out; the new `/ready`
returned 503 and returned to 200 after MongoDB recovery. No performance pass was
claimed from that failed interval.

A later full run exposed a separate real layout issue: the shared footer could
paint before streamed page content and homepage CLS reached .2422. The shared
main shell now reserves the viewport. Fifteen repeated performance checks passed
before the final matrix, where home/shop/PDP CLS measured 0/.0011/0.

## Security and production configuration

- No tracked secret/environment file; secret-looking tracked-content scan clean.
- Production environment validation requires HTTPS public origins, Live payment
  mode/live-key classification, webhook secret, and sender identity.
- Browser origin enforcement covers login, Google, OTP verification, refresh,
  logout, account deletion, and session revocation as appropriate.
- Customer/admin refresh cookies are distinct.
- CSP, nosniff, framing, referrer, and permissions headers are present on both UIs.
- Upload folders are constrained; webhook audit payloads are data minimized.
- CSV injection neutralization covers Admin Analytics/data tables/catalogue helpers
  and server catalogue/error reports.
- npm audit reports zero known vulnerabilities.

## SEO, accessibility, and resilience

- Storefront titles/canonicals and product JSON-LD are present and escaped.
- Dynamic sitemap produced 83 URLs during audit; robots excludes private routes.
- Admin has a meaningful title and noindex/nofollow/noimageindex.
- Homepage main landmark, muted contrast, skip target, and table keyboard focus fixed.
- Product API outage shows retry instead of false empty; media failure uses a local
  branded fallback; current S3/placehold catalogue hosts no longer fail the optimizer.

## Payment closure evidence

- `EXT-PAY-001`: closed by captured Test orders `order_TCTGXphBQ9TD4r` and
  `order_TCTf6hQZfsRb5d`, verified callbacks, one attempt/stock change, and
  UI/API/DB/Admin reconciliation.
- `EXT-REF-001`: closed by partial/full processed refunds, bounds/authorization,
  same-key replay, provider balances, analytics, and customer/Admin visibility.
- Signed local webhook replay used actual provider entities: valid 200, invalid
  401, duplicate `processed:false`, unknown order safe. Concurrent real verify and
  captured replay left a fully refunded order's paid/refunded/due, attempt,
  timeline, and stock unchanged.

## Sole remaining prerequisite — EXT-WEB-001

1. Sign into the Razorpay account matching the configured Test key and switch to
   Test Mode.
2. Confirm the recorded orders, payments, and refunds in Transactions.
3. Register the final public HTTPS endpoint
   `/api/v1/payments/webhooks/razorpay` for captured/paid/failed/refund events.
4. Deliver or retry real Test events and retain Dashboard delivery IDs/statuses.
5. Confirm duplicate delivery remains `processed:false` and no accounting changes.

After this prerequisite plus production secrets, backup, and deployment checklist
are complete, promote the recommendation from CONDITIONAL GO to GO.
