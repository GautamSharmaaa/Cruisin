# Cruisin Deployment Checklist

## Before deployment

- [x] Razorpay Test provider-success and refund evidence gates are closed (two captures, processed partial/full refunds).
- [ ] Release commit and immutable client/admin/API artifacts are recorded.
- [ ] `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
      `npm run test:e2e`, and both npm audits pass.
- [ ] MongoDB backup is created and a restore drill/owner is recorded.
- [ ] Migration/index impact is reviewed, including unique sparse
      `checkoutIdempotencyKey` and `paymentSettlementStartedAt`.
- [ ] HTTPS storefront/admin origins are final and match CORS/origin settings.
- [ ] Production secret store contains MongoDB, Redis, JWT, Cloudinary, Razorpay
      Live key/secret, Razorpay webhook secret, email provider, and `EMAIL_FROM`.
- [ ] `PAYMENT_MODE=live`; Live key prefix verified without printing it.
- [ ] Razorpay webhook URL is public HTTPS and subscribed to captured/failed/refund events.
- [ ] Matching Razorpay Dashboard Test account shows the audited provider order/payment/refund IDs and a successful actual delivery to the public webhook.
- [ ] DNS, TLS, CDN/cache, error monitoring, log retention, and alert routing are ready.
- [ ] Rollback owner, payment-reconciliation owner, and customer-support owner are on call.

## Deploy order

1. Deploy API with migrations/indexes and keep it out of traffic until `/ready` is 200.
2. Smoke `/health`, `/ready`, public config/products/CMS, and signed-auth rejection.
3. Deploy Admin; confirm noindex headers/meta, login, orders, users, catalogue, analytics.
4. Deploy Storefront; confirm homepage, shop, PDP, cart, login, checkout config,
   robots, sitemap, metadata, CSP, and image fallback.
5. Shift traffic gradually and monitor 4xx/5xx, readiness, Mongo/Redis latency,
   checkout creation, payment callbacks, webhooks, and stock conflicts.

## Post-deploy commerce smoke

- [ ] Create a uniquely labelled low-value live smoke order approved by the owner.
- [ ] Confirm one local order and one provider order for repeated retry.
- [ ] Complete payment and reconcile total/paid/due/provider IDs/timeline/stock once.
- [ ] Confirm Admin and customer order detail agree.
- [ ] Execute the approved refund smoke and reconcile the webhook.
- [ ] Cancel/clean only the labelled smoke data according to financial policy.
- [ ] Observe error/latency/payment dashboards for at least one full monitoring window.

If any critical invariant fails, stop traffic changes and follow `ROLLBACK_PLAN.md`.

## Completed pre-deployment Test evidence — 2026-07-12

- Captured Test payments: ₹23,202 and ₹1,725; signature/accounting/stock/UI reconciled.
- Processed refunds: partial ₹5,000 and full ₹1,725; provider and application totals agree.
- Refund edge/idempotency, invalid/duplicate/unknown signed webhook handling, and
  concurrent verify/webhook replay pass.
- 89/89 unit/service tests, all workspace typecheck/lint/build gates, and final
  Admin Chromium 3/3 pass.
- This section does not check off the public Dashboard webhook item above.
