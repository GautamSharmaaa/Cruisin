# Cruisin Production Readiness

Audit date: 2026-07-12 (Asia/Kolkata)  
Current recommendation: **CONDITIONAL GO.**

The application changes, local production artifacts, genuine Razorpay Test
captures, and processed provider refunds are release-candidate quality. The only
remaining condition is actual Razorpay Dashboard delivery to the final public
HTTPS webhook endpoint; signed local replay is supporting evidence, not a
substitute for that deployment proof.

## Architecture

- Storefront: Next.js on 3000.
- Admin: Next.js on 3001.
- API: Express/Mongoose on 8000.
- MongoDB: required durable store.
- Redis: readiness dependency and session/cache infrastructure.
- Razorpay: primary online provider; Test in QA, Live required in production.
- SendGrid/email and Cloudinary: notification/media integrations.

## Proven readiness controls

- `/health` is liveness only; `/ready` returns 200 only when MongoDB and Redis are ready.
- SIGINT/SIGTERM stop accepting traffic and close dependencies.
- Production configuration rejects non-HTTPS public origins, Test payment mode,
  non-live Razorpay keys, missing webhook secret, and missing sender identity.
- Customer/admin refresh cookies are separated, origin scoped, rotated, and revoked.
- Checkout totals are server priced; checkout creation has a persisted UUID
  idempotency key; settlement has a recoverable five-minute lease.
- Paid/partial balances, stock reservation, transition rules, ownership, coupon
  limits, refunds, and webhook replay have focused regressions.
- Two Test wallet captures and provider-processed partial/full refunds reconcile
  across Razorpay/API/DB/storefront/Admin; refund idempotency and analytics impact
  are proven with real provider IDs.
- Admin is noindex/nofollow. Storefront has titles, canonicals, stock-aware JSON-LD,
  robots, and a dynamic sitemap.
- Current catalogue image hosts are explicitly allowed; failure uses a local asset.

## Quality evidence

- 89 unit/service tests pass (72 server, 7 storefront, 10 Admin).
- All workspace typechecks and lint scripts pass.
- All three production builds pass.
- Full Playwright: 52 passed and 3 configuration-based NA skips (55 total) across
  desktop Chromium plus supported mobile Chromium, Firefox, and WebKit smoke.
- Axe: no serious/critical WCAG A/AA violations on five critical surfaces.
- npm audit: 0 production and 0 complete vulnerabilities.
- Local production budgets: home LCP 136ms/CLS 0; shop LCP 220ms/CLS .0011;
  PDP LCP 128ms/CLS 0.

## Mandatory gates before release

1. Sign into the matching Razorpay Dashboard Test account, confirm the recorded
   captured payments/refunds, register the final public HTTPS webhook, and prove
   actual Dashboard delivery/retry for captured/failed/refund events.
2. Supply production secrets through the hosting secret store and execute the
   deployment checklist without logging values.
3. Take a restorable database backup and record the artifact/commit identifiers.

## Closed provider gates

- PAY-002 / EXT-PAY-001: pass/closed with captured Mobikwik Test payments for
  ₹23,202 and ₹1,725.
- PAY-006 / EXT-REF-001: pass/closed with processed partial ₹5,000 and full
  ₹1,725 refunds, idempotency, bounds, analytics, and UI reconciliation.
- QG-010: pass. `EXT-WEB-001` is tracked separately as the sole external
  deployment prerequisite.

## Data notes

- QA orders are labelled by QA names/order references; they must never be fulfilled.
- Deterministic analytics rows use `isAnalyticsTestData` and a batch ID.
- The published homepage currently has three CMS sections. Newsletter and
  recently-viewed homepage modules are not published and are classified NA.

Detailed evidence is in `docs/qa/FINAL_PRODUCTION_QA_REPORT.md` and the runbooks
in this directory.
