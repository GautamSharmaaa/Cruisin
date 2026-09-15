# Return/exchange restoration — deployment readiness

Date: 2026-09-15. Baseline: main / origin/main at `084d012`.

## Outcome and scope

The restored return/exchange release passed local validation and is ready for a
coordinated API, storefront and admin deployment. Nothing was pushed or deployed
during this preparation. No production data was changed.

The return feature originally landed in `4c06788` (August 13). Reconciliation
commit `6378428` (September 11) removed its import, rendered panel and tracking
lookup from customer order details. The live storefront JavaScript was checked
and the missing button reproduced at 1280x900 and 390x844 using intercepted API
requests, even for a mock eligible delivered order.

## Prepared changes

- Restore the order-detail return/exchange panel and courier delivery-window query.
- Fail closed when tracking is loading, unavailable, malformed or ineligible;
  expired and cancelled orders cannot start requests.
- Display exchange history in order details and the account request-history page.
  Return and exchange selectors share one cached API response and refresh every
  minute; payment verification invalidates both views through the existing key.
- Preserve exchange request idempotency across retries of the same order, original
  item, replacement and quantity. Clear the attempt key after paid confirmation.
- Keep keyboard focus inside the modal and restore focus when it closes.
- Make eligibility reads non-mutating. Use the newest forward shipment and reject
  missing/future delivery timestamps or an expired five-day window.
- Restore admin COD-collected filtering, readable successful payment badges and
  collected-order/revenue totals without removing archive or date-filter features.
- Reject manual shipped-to-delivered transitions in both admin UI and API. Existing
  Shiprocket webhook/sync paths remain responsible for delivery confirmation.

No schema migration, invoice regeneration, historical backfill, fee change or GST
change is part of this release. Existing invoice, GST, refund, wallet, cost and
analytics implementations remain on the baseline rather than being replaced by
old stash versions.

## Validation

| Check | Result |
| --- | --- |
| All workspace TypeScript checks | Passed |
| Storefront unit tests | 24 files / 90 tests passed |
| Admin unit tests | 9 files / 31 tests passed |
| API unit/integration tests | 60 files / 390 tests passed |
| Return/exchange production-build browser tests | 22 tests passed, desktop and 390x844 mobile |
| Storefront, admin and API production builds | Passed; affected workspaces rebuilt after final runtime changes |
| Built frontend Shiprocket server-only marker scan | Passed, 217 files |
| Diff whitespace/error check | Passed |

Browser cases cover eligible delivery, expired window, missing timestamp, failed
tracking, cancellation, undelivered order, modal focus, evidence validation and
review, paid-request replay, exchange availability/retries and exchange history.
Mobile screenshots were inspected for layout. The browser suite mocks every API
request and blocks non-local unmocked traffic. It starts only the storefront, not
an API against a production database.

Server integration tests use only the guarded localhost database
`cruisin-sync-order-analytics-tests`. Shiprocket live reads/documents/mutations are
disabled and payment services mocked. The full server suite also exercises existing
invoice/GST, analytics, Shiprocket replay, refund and return-payment code.

Railway production configuration was checked without printing credentials:
storefront payment key/API configuration present; API Razorpay key/secret present;
Shiprocket enabled in live mode. Manual UPI refunds default to enabled in the API
configuration when the environment flag is absent. Credential validity, actual
payments, refunds and courier pickups were not tested against live providers.

## Remaining branch inventory

The preceding all-branch audit found one separate unreleased runtime feature:
`codex/admin-promotion-engine-bogo` / `d8fd527` (advanced BOGO promotion engine).
It is intentionally not merged into this restoration. It needs its own conflict,
migration and pricing review before being included. The other divergent Shiprocket
QA commit concerns ignored test artifacts, not runtime behavior. Preserved stashes
must not be applied wholesale: doing so would overwrite newer archive, invoice and
other production code.

## Deployment checklist — not executed

1. Review the prepared release diff and its scope. Ensure no `.env`, credentials,
   screenshots, old stash content or unrelated BOGO changes are included.
2. Push the approved release commit to the configured deployment branch only when
   deployment is authorized. A push to main may trigger Railway auto-deployments.
3. Deploy API, storefront and admin from the same approved source revision. If
   deploying services manually, deploy API first, then storefront and admin.
4. Confirm each Railway deployment succeeds and each service `/health` responds.
5. Verify the storefront deployment source revision; do not assume a CLI-uploaded
   source tree matches main when its metadata has no commit hash.
6. With an existing eligible customer order, verify the live button/window and
   request-history links on desktop/mobile. Confirm cancelled, expired and
   undelivered orders remain disabled. Check COD pending/collected filtering and
   collected totals without changing an order's delivery status manually.
7. Confirm existing invoices, five-percent inclusive GST, wallet/refund history,
   cost analytics and general analytics remain accessible. Avoid backfills or
   financial/provider mutations as an incidental smoke test.
8. Any real payment, refund or reverse-pickup validation requires an explicitly
   approved transaction/order. Do not create live test financial operations.
9. If a regression appears, roll back affected services to their previously verified
   deployment artifacts. No database rollback is needed for this release's changes.

Re-run commands:

```sh
npm run typecheck
npm --workspace client run test
npm --workspace admin run test
npm --workspace server run test
npm run build
npm --workspace client run test:e2e:returns
node scripts/verify-logistics-secrets.mjs
git diff --check
```

Do not run the broader browser suite blindly with production URLs: some existing
repository suites intentionally create records, seed databases or submit actions.
