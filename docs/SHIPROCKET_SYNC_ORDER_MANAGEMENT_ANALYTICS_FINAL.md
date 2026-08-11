# Shiprocket Sync, Order Management, and Analytics — Final Pre-deployment Report

Prepared on 2026-08-11. This report covers development and verification only. No production deployment, production index operation, Shiprocket mutation, or reconciliation schedule was performed.

## Executive gate

- Backup verified: **PASS**
- Local restore verified: **PASS**
- Production documents modified during development: **0**
- Production indexes modified during development: **0**
- Production destructive commands: **0**
- Full repository verification: **PASS**
- Isolated logistics Playwright matrix: **9/9 PASS**
- Production dependency audit: **0 vulnerabilities**
- Deployment: **NOT STARTED — awaiting explicit approval**
- Recommendation: **CONDITIONAL GO**

## Required findings

### 1. Git branch/revision

- Branch: `codex/feat-shiprocket-sync-order-management-analytics`
- Pre-change checkpoint: `41c5e33c9d61e91f25ae340edd3b1656d42cb715`
- Verified implementation revision: `fcd9aeb`
- Implementation diff: 69 files, 1,707 insertions, 691 deletions.

### 2. Backup result

The classified production Atlas database `cruisin` was dumped successfully before application source changes. The compressed archive is stored outside the repository with owner-only `600` permissions. Size: 295,123 bytes. Exit code: 0.

### 3. Backup checksum

SHA-256: `9af70db0ead08c1ef67c67bc413e1176d4d40813cad0c4be67e4f38919523310`. The sidecar is owner-only (`600`), and an independent `shasum -a 256 -c` verification returned `OK`.

### 4. Restore verification

The archive restored successfully to a localhost-only MongoDB 7.0 database. All 44 collections were readable. Business, payment, order, shipment, return, exchange, and logistics counts matched a read-only production comparison. The only drift was the TTL-managed `usersessions` collection: 552 records in the captured archive versus 555 in the later live read. Important order, shipment, logistics, payment-webhook, return, and exchange indexes were present in the restore.

### 5. Production DB changes during development

Exact result:

```text
Production documents modified during development: 0
Production indexes modified during development: 0
Production destructive commands: 0
```

Production was used only for the pre-change dump and bounded read-only comparisons. All writes, tests, seeds, index creation, archive/restore exercises, and browser QA targeted the exact localhost test database guard.

### 6. Shiprocket architecture reused

The existing shipment model, provider abstraction, Shiprocket client/provider, logistics service, webhook event ledger, job model, notification service, admin routes, and customer tracking route were extended instead of replaced. One shared synchronization service now applies both webhook and polling snapshots, which prevents two independent state-transition implementations.

### 7. Webhook implementation

`POST /api/v1/webhooks/logistics-events` accepts bounded Shiprocket events, creates a deterministic sanitized fingerprint, deduplicates by provider and fingerprint, and resolves shipments in strict order: AWB, provider shipment ID, provider order ID, then an explicit trusted channel/source order ID. Shiprocket `order_id` is never reused as a local order fallback. Matched events pass through the shared snapshot applicator; unmatched events are safely marked ignored.

### 8. Webhook security

The route uses a timing-safe `x-api-key` comparison, rejects missing/invalid keys, validates identifier/status presence and field bounds, limits scan count, runs behind the server's 1 MB JSON-body ceiling, sanitizes stored payloads and errors, and avoids PII-based matching or PII logging. Unique fingerprinting makes replay idempotent. Production still requires an HTTPS public URL and a matching secret in both the app and Shiprocket settings.

### 9. Read-only reconciliation

The provider reconciliation path performs GET-only Shiprocket lookups for shipment, order, and tracking state. The CLI scans only active shipments in a bounded batch (default 25, maximum 100), caps concurrency at 5 (default 3), refuses live-mutation mode, and prints `Shiprocket mutations: 0`. Webhook remains primary; reconciliation is the missed-webhook fallback. The selected endpoints and status-code behavior align with the [official Shiprocket API documentation](https://apidocs.shiprocket.in/).

### 10. Manual Sync now

Admins can run `POST /api/v1/admin/logistics/:shipmentId/sync`. It invokes only read-only reconciliation, refreshes shipment/order/analytics queries, reports success, and exposes a retryable `Sync failed — Retry` error without leaking provider internals.

### 11. AWB discovery

AWB is discovered from webhook or read-only reconciliation and persisted only after identifier-integrity checks. Cruisin no longer asks an admin to create or assign an AWB in the normal UI.

### 12. Courier discovery

Courier ID/name are mirrored from Shiprocket snapshots and rendered in admin and customer tracking. They are not fabricated locally in live-readonly mode.

### 13. Pickup discovery

Pickup status/date are mirrored from webhook or reconciliation. Pickup scheduling remains a manual Shiprocket-dashboard operation.

### 14. Tracking synchronization

Tracking scans use deterministic fingerprints, stable chronological merging, scan deduplication, source attribution, last-attempt/success timestamps, latest location/message, and estimated delivery. Webhook replay and later polling converge on the same persisted state.

### 15. Status mapping

A single central mapper covers provider text and numeric codes, including pickup, in-transit, out-for-delivery, NDR, RTO, delivered, cancelled, lost, damaged, delivery exception, and related states. Terminal states cannot be downgraded by stale events, and unknown provider statuses are audited without forcing an unsafe transition.

### 16. Customer tracking

Customer APIs and UI expose only customer-safe status, message, courier, tracking number, ETA, latest update/location, and a safe timeline. Raw Shiprocket status text and numeric provider codes are not returned.

### 17. Admin tracking

The logistics control center shows provider order/shipment IDs, real courier/AWB, pickup, mapped status, ETA, latest update/location, last webhook/reconciliation success, sync source/error diagnostics, and the real scan timeline.

### 18. `Assign AWB` removal

Normal admin logistics pages no longer expose `Select courier`, `Assign AWB`, pickup scheduling, or label/invoice/manifest generation/printing. Legacy mutation endpoints remain for backwards compatibility and isolated mock workflow tests, but are not part of the owner UI.

### 19. `Ship` implementation

Before provider-order creation, the UI shows `Create Shiprocket Order`. After creation, it shows `Ship` and `Sync now`. `Ship` opens a `Ship this order` dialog with `Open Shiprocket`, `Sync now`, and `Close`; the dashboard URL is configurable through `NEXT_PUBLIC_SHIPROCKET_DASHBOARD_URL` and defaults to Shiprocket's app.

### 20. Railway reconciliation cron

The safe command is `npm --workspace server run logistics:reconcile:shiprocket`. Suggested schedule: `*/5 * * * *`. Required deployment settings include Shiprocket enabled, `live-readonly` mode, live reads enabled, and live mutations disabled. **No Railway cron was created or enabled during development.** Enable it only after deployment approval, configuration verification, and a successful manual read-only run.

### 21. Archive implementation

Manager/admin/superadmin users can archive an order with an optional reason. Archive hides the record from the default active list but preserves payment, shipment, tracking, refund, inventory, and financial history. The operation is idempotent.

### 22. Restore implementation

Manager/admin/superadmin users can restore an archived order. Restore clears archive metadata without changing financial or fulfillment state.

### 23. Delete button implementation

Delete remains visible for active and archived orders. Selecting it always calls the server dry-run first. Blocked orders receive reasons and an archive recommendation; eligible test orders receive a typed-confirmation dialog.

### 24. Delete dry-run

`GET /api/v1/admin/orders/:id/delete-eligibility` returns classification, eligibility, blockers, and related-record counts without modifying data. It is available to authorized admin roles so the UI can always explain why deletion is blocked.

### 25. Delete blockers

Deletion fails closed for any order not explicitly marked test, ambiguous or settled payments, COD settlement, provider payment references, captured attempts, refund/payment-webhook history, reserved inventory, tracking, Shiprocket identifiers, real or uncertain shipment state, webhook history, and active or financially significant return/exchange state.

### 26. Test-order classification

The only deletable classification is `SAFE_TEST_ORDER`: explicit test flag plus an unambiguously unpaid state and no blocker. A real but otherwise empty order is `REAL_ORDER_ARCHIVE_ONLY`; any risky or uncertain record is `UNSAFE_TO_DELETE`.

### 27. Delete RBAC

Dry-run is available to manager/admin/superadmin. Archive/restore are available to those same roles. Permanent delete is server-restricted to superadmin. Route/RBAC tests prove a normal admin cannot permanently delete.

### 28. Delete transaction safety

The service performs an initial eligibility check, requires exact order-number and reason confirmation, starts a MongoDB transaction, rechecks eligibility inside that transaction, uses the same session for every read/write, deletes only explicitly allowlisted order-owned records, and verifies the order still has a test flag. If transactions are unsupported or state changes, it aborts and returns a safe conflict. Local standalone Mongo therefore proves the fail-closed path; the Atlas transaction path requires post-deployment verification on a disposable test order.

### 29. Delete tombstone

A minimal tombstone records order number, deletion time/admin, reason, test-order marker, and counts of removed related records. It contains no customer PII, address, line items, payment token, or provider secret.

### 30. Analytics root cause

The old dashboard counted every order document, including failed, abandoned, pending, and cancelled-unpaid checkouts. Revenue used inconsistent subtotal/order-status logic, omitted some collected cancelled payments, did not model refunds separately, used inconsistent timezone boundaries, included test data, and was not invalidated after several order/logistics mutations.

### 31. Correct analytics source of truth

Commerce truth now comes from Orders plus captured/paid amount and refund history. Business-order counts exclude abandoned failed/pending attempts and cancelled-unpaid orders. Gross is collected money, refunds are separate, and net is gross minus refunds, including paid orders that were later cancelled.

### 32. Current order counts

The restored snapshot has 41 raw order documents: 12 COD, 28 online, and 1 partial. Under corrected last-30-day business semantics it has 15 orders, of which 9 are paid; today's IST window has 4 business orders, all pending COD. No restored order was explicitly test-flagged.

### 33. Revenue metrics

On the verified restored snapshot for 2026-07-13 through 2026-08-11:

| Metric | Old dashboard | Corrected analytics |
| --- | ---: | ---: |
| Business/order documents counted | 41 | 15 |
| Paid orders | 4 | 9 |
| Cancelled orders | 18 | 5 |
| Gross collected | ₹7 | ₹947 |
| Refunds | ₹28 | ₹28 |
| Net collected | ₹7 | ₹919 |

Corrected AOV is ₹105.22, COD outstanding is ₹8,004, and customers are 10 (7 new, 3 returning). These are read-only predictions from the pre-change restored snapshot, expressed in the application's database currency units; they are not live post-deployment results.

### 34. Test-order exclusion

Analytics excludes both `isTestOrder` and existing analytics-test flags by default. A superadmin-only toggle can include them for diagnostics.

### 35. Archived-order semantics

Archiving is an operational view change, not a financial rewrite. Archived real orders remain in historical analytics when they satisfy business/payment truth; restoring them does not create a second count.

### 36. IST reporting

Today and date-range boundaries use `Asia/Kolkata`. Integration coverage includes the IST midnight boundary.

### 37. Admin refresh/invalidation

Analytics and order resources poll every 60 seconds, refetch on window focus, expose manual Refresh/last-updated UI, and are invalidated after order status/payment, archive/restore/delete, provider-order creation, and shipment synchronization changes.

### 38. Shiprocket/analytics interaction

Logistics state updates change operational fulfillment/RTO metrics without redefining collected payment. Shipment RTO remains distinct from returned orders. Archive does not remove money; permanent deletion is limited to safe unpaid test orders and explicitly invalidates analytics caches.

### 39. Unit/integration results

`npm run verify:logistics` passed end-to-end:

- Server: 39 files, 249 tests passed.
- Client: 15 files, 56 tests passed.
- Admin: 5 files, 22 tests passed.
- Focused logistics: 9 files, 47 tests passed.
- Lint: all workspaces passed.
- Typecheck: all workspaces passed.
- Production builds: client, admin, and server passed.
- Frontend Shiprocket-secret scan: passed across 198 built files.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `git diff --check`: passed.

Coverage includes sync mapping/dedupe/terminal guards, read-only provider reconciliation, webhook lookup priority/replay/security, archive/restore/delete eligibility, RBAC, transaction fail-closed behavior, tombstones, corrected analytics/revenue, IST boundaries, and cache invalidation.

### 40. Playwright results

The exact guarded localhost database and Redis DB 15 were seeded in mock Shiprocket mode with live reads/mutations disabled. Result: **9/9 passed**. The matrix covers the new Shiprocket UI, `Ship` modal, absence of primary AWB controls, successful/failed manual sync, prepaid settlement/provider outage/retry/idempotency, webhook delivery, NDR, RTO inventory, return, exchange, and exact typed confirmation for a safe test order. The test cancels at the confirmation gate and does not permanently delete.

### 41. Browser QA

Manual in-app browser QA against isolated localhost data verified:

- Logistics page provider IDs, courier, AWB, pickup/status/ETA/update/location, sync diagnostics, `Ship`, `Sync now`, and absence of `Assign AWB`.
- Active/Archived/All views, archive confirmation, archived badge, Restore, always-visible Delete, and blocked real-order delete reasons.
- Analytics refresh/range controls, test-data toggle, IST last-updated display, and fixture metrics.
- Customer-safe tracking details and timeline.

The exact safe-test-order typing behavior was additionally verified in real-browser Playwright: wrong text keeps deletion disabled; exact text enables it; the test cancels without deleting. The later in-app attempt did not complete authentication reliably, so this specific interaction is reported as automated browser coverage, not a successful second manual deletion exercise.

### 42. Production read-only comparison

The current analytics implementation was executed against the verified local production restore, never the live database. The old algorithm predicted 41 counted documents, while corrected business semantics predict 15 last-30-day orders and 4 today. Gross/refund/net predict ₹947/₹28/₹919 versus the old ₹7/₹28/₹7 presentation. No PII was printed or stored in the report.

### 43. Webhook production audit

Code inspection confirms the production route, timing-safe key check, validation, dedupe, payload ceiling, sanitization, no PII matching, and test coverage. A keys-only environment inspection found Shiprocket API email/password and pickup configuration, but did **not** find `SHIPROCKET_WEBHOOK_SECRET`, `SHIPROCKET_ENABLED`, `SHIPROCKET_MODE`, `SHIPROCKET_ALLOW_LIVE_READS`, or `SHIPROCKET_ALLOW_LIVE_MUTATIONS` in the local production-looking environment. No public backend URL was available locally. External Railway and Shiprocket dashboard settings were not accessed. Therefore the HTTPS callback, correct public backend, and matching `x-api-key` are not independently verified.

### 44. Production deployment status

**Not deployed.** No Railway deployment, cron creation, webhook configuration, production migration, production index creation, live reconciliation, or Shiprocket mutation was performed. This is the required user approval stop.

### 45. Remaining limitations

Before deployment:

1. Set and independently verify the production mode/read/mutation flags; mutations must remain false.
2. Create a strong webhook secret and configure the same value in Railway and Shiprocket without exposing it to frontend builds or logs.
3. Confirm the public HTTPS target ends with `/api/v1/webhooks/logistics-events` and receives the configured `x-api-key`.
4. Run one bounded reconciliation manually and confirm `Shiprocket mutations: 0` before enabling the five-minute fallback schedule.
5. Confirm Atlas transactions with one explicitly marked, unpaid disposable test order after deployment. Stop for a separate approval before any first real production permanent deletion.
6. Validate corrected analytics, sync health, customer/admin tracking, and webhook receipt read-only after deployment.

Legacy Shiprocket mutation endpoints remain reachable to authorized callers for compatibility even though the primary UI no longer exposes them. If strict API-level read-only operation is desired later, deprecate/remove them in a separate compatibility release.

### 46. Final recommendation

## CONDITIONAL GO

The code, isolated safety controls, builds, tests, browser coverage, backup, and restore are deployment-ready. Deployment should proceed only after the webhook/public-URL and live-readonly environment checklist in sections 43–45 is satisfied and the user explicitly approves deployment. Do not enable the cron or perform permanent production deletion as part of the initial deployment.

## Changed-file groups

- Admin: logistics control center/panel/dialog, orders archive/delete UX, analytics UI, hooks, DTO/config/query invalidation.
- Client: safe shipment tracking and logistics browser tests/config.
- Server: analytics service, order management/tombstone/routes/validation, shipment sync/reconciliation/provider/webhook/status/controller/model diagnostics, test DB guard, isolated seed, and tests.
- Operations/docs: `.gitignore`, admin environment example, package scripts, backup verification, and this final report.

Use `git show --stat fcd9aeb` for the complete committed 69-file implementation list.
