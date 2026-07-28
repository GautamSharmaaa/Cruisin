# Shiprocket Implementation Plan

This plan follows the completed audit in `CODEBASE_ARCHITECTURE_AUDIT.md`. The integration is provider-neutral, disabled by default, mock-first, and additive.

## Safety invariants

- Shiprocket credentials and tokens exist only in the server process.
- `mock` is the default and the only mode used by automated tests.
- Live reads require both `live-readonly|live` and `SHIPROCKET_ALLOW_LIVE_READS=true`.
- Live mutations require `live` and `SHIPROCKET_ALLOW_LIVE_MUTATIONS=true`.
- No live mutation is run during startup, CI, verification, or this implementation.
- Payment success never depends on Shiprocket availability.
- A local order and a captured payment are never deleted or downgraded by a logistics failure.
- Unique idempotency keys protect provider order, AWB, pickup, documents, cancellation, return, exchange, and webhook processing.
- Provider status never overwrites payment status and never downgrades a terminal shipment status.
- Customer APIs return normalized data and never raw provider responses/errors.

## Files to add

### Server

- `server/src/types/logistics.types.ts`
- `server/src/config/logistics.ts`
- `server/src/models/shipment.model.ts`
- `server/src/models/logistics-quote.model.ts`
- `server/src/models/logistics-job.model.ts`
- `server/src/models/logistics-webhook-event.model.ts`
- `server/src/models/logistics-audit.model.ts`
- `server/src/models/package-preset.model.ts`
- `server/src/models/return-request.model.ts`
- `server/src/models/exchange-request.model.ts`
- `server/src/services/logistics/logistics-provider.ts`
- `server/src/services/logistics/shiprocket-client.ts`
- `server/src/services/logistics/shiprocket-provider.ts`
- `server/src/services/logistics/mock-logistics-provider.ts`
- `server/src/services/logistics/provider-factory.ts`
- `server/src/services/logistics/package-calculator.ts`
- `server/src/services/logistics/logistics-quote.service.ts`
- `server/src/services/logistics/logistics-status.ts`
- `server/src/services/logistics/logistics-job.service.ts`
- `server/src/services/logistics/logistics.service.ts`
- `server/src/services/logistics/logistics-analytics.service.ts`
- `server/src/services/logistics/return-exchange.service.ts`
- `server/src/controllers/logistics.controller.ts`
- `server/src/controllers/logistics-webhook.controller.ts`
- `server/src/routes/v1/logistics.routes.ts`
- `server/src/routes/v1/logistics-webhook.routes.ts`
- `server/src/validators/logistics.validator.ts`
- `server/logistics-worker.ts`
- `server/src/scripts/shiprocket-live-smoke.ts`
- `server/src/scripts/shiprocket-live-cleanup.ts`
- focused `*.test.ts` files for configuration, client behavior, package calculation, quotes, statuses, analytics, workflows, and routes.

### Storefront

- `client/hooks/useLogistics.ts`
- `client/components/checkout/delivery-serviceability.tsx`
- `client/components/account/shipment-tracking.tsx`
- `client/app/(shop)/account/orders/[id]/tracking/page.tsx`
- focused component/library tests.

### Admin

- `admin/hooks/useLogistics.ts`
- `admin/components/logistics/logistics-control-center.tsx`
- `admin/components/logistics/logistics-analytics.tsx`
- `admin/components/logistics/ndr-manager.tsx`
- `admin/components/logistics/rto-manager.tsx`
- `admin/components/logistics/returns-manager.tsx`
- `admin/components/logistics/exchanges-manager.tsx`
- `admin/components/logistics/order-shipping-panel.tsx`
- `admin/app/(dashboard)/logistics/page.tsx`
- `admin/app/(dashboard)/logistics/analytics/page.tsx`
- `admin/app/(dashboard)/logistics/ndr/page.tsx`
- `admin/app/(dashboard)/logistics/rto/page.tsx`
- `admin/app/(dashboard)/returns/page.tsx`
- `admin/app/(dashboard)/exchanges/page.tsx`

### Documentation

- `docs/SHIPROCKET_INTEGRATION.md`
- `docs/SHIPROCKET_LOCAL_TESTING.md`
- `docs/LOGISTICS_ADMIN_DASHBOARD.md`
- `docs/SHIPROCKET_PRODUCTION_CHECKLIST.md`
- `docs/SHIPROCKET_TROUBLESHOOTING.md`

## Files to modify

- root and server `package.json` scripts; lockfile only if a dependency is required.
- `server/.env.example`.
- `server/src/config/env.ts`.
- `server/src/config/redis.ts` for an atomic expiring lock operation.
- `server/src/app.ts` and `server/src/routes/v1/index.ts`.
- `server/src/routes/v1/admin.routes.ts` and `order.routes.ts`.
- `server/src/models/model-registry.ts` and `scripts/ensure-indexes.ts`.
- `server/src/models/product.model.ts` for packaging metadata.
- `server/src/models/order.model.ts` for explicit fulfilment state and selected quote reference.
- `server/src/services/order.service.ts` for quote enforcement and a non-blocking, idempotent post-payment/COD logistics job.
- `server/src/validators/order.validator.ts` and product validators.
- `client/app/(shop)/checkout/page.tsx`, order detail, order types, routes, and copy.
- `admin/components/dashboard/sidebar.tsx`, order detail, hooks, types, and copy.
- CI environment/scripts to force mock mode and run safe logistics verification.
- `docker-compose.yml` to include local Redis.

## Database changes and indexes

No destructive migration is required. New collections and optional fields are additive.

- `Shipment`: unique provider/idempotency identifiers; indexes on order, AWB, provider IDs, status/type, update time, NDR/RTO/return/exchange states.
- `LogisticsQuote`: unique quote ID; user/cart ownership; TTL expiry.
- `LogisticsJob`: unique dedupe key; status/run time/lease indexes.
- `LogisticsWebhookEvent`: unique provider/fingerprint.
- `LogisticsAudit`: shipment/order/admin/time indexes.
- `PackagePreset`: unique name/code.
- `ReturnRequest`: unique request number and optional shipment/idempotency constraints.
- `ExchangeRequest`: unique request number, reverse/replacement links, idempotency constraints.
- Product: packaging weight, packed dimensions, package preset, maximum quantity per package.
- Order: optional fulfilment state, logistics quote ID, logistics-error marker.

Production must run `npm --workspace server run db:indexes:production` before enabling mutations.

## API routes

Customer:

- `POST /api/v1/logistics/quotes`
- `GET /api/v1/orders/:id/tracking`

Provider-neutral webhook:

- `POST /api/v1/webhooks/logistics-events`

Admin:

- `GET /api/v1/admin/logistics`
- `GET /api/v1/admin/logistics/kpis`
- `GET /api/v1/admin/logistics/analytics`
- `GET /api/v1/admin/logistics/ndr`
- `GET /api/v1/admin/logistics/rto`
- `GET /api/v1/admin/logistics/jobs`
- `GET /api/v1/admin/logistics/:shipmentId`
- `POST /api/v1/admin/logistics/:shipmentId/package/confirm`
- `POST /api/v1/admin/logistics/:shipmentId/compare-couriers`
- `POST /api/v1/admin/logistics/orders/:orderId/create`
- `POST /api/v1/admin/logistics/:shipmentId/assign-awb`
- `POST /api/v1/admin/logistics/:shipmentId/schedule-pickup`
- `POST /api/v1/admin/logistics/:shipmentId/label`
- `POST /api/v1/admin/logistics/:shipmentId/invoice`
- `POST /api/v1/admin/logistics/:shipmentId/manifest`
- `POST /api/v1/admin/logistics/:shipmentId/track`
- `POST /api/v1/admin/logistics/:shipmentId/cancel`
- `POST /api/v1/admin/logistics/:shipmentId/ndr/action`
- CRUD/action routes for returns and exchanges under `/api/v1/admin/returns` and `/api/v1/admin/exchanges`.

All writes require manager/admin/superadmin; inventory restoration and refunds remain admin/superadmin operations.

## Provider and client behavior

The client uses the fixed `SHIPROCKET_BASE_URL`, bearer authentication, a conservatively cached 10-day token, single-flight refresh, one forced refresh on 401, AbortController timeout, correlation IDs, Zod response validation, redacted structured errors, and bounded exponential retry with jitter for network errors, 429, 502, 503, and 504 only.

The provider interface implements serviceability/rates, create order, courier/AWB, pickup, label, invoice, manifest, tracking, cancellation, and return. The complete mock provider exposes deterministic fixtures for success, duplicate, NDR/RTO, delivered, cancellation rejection, timeout, rate limiting, malformed response, and temporary outage.

Official endpoint shapes are checked against [Shiprocket API documentation](https://apidocs.shiprocket.in/). Live behavior remains gated until an account-specific read-only smoke test succeeds.

## Checkout integration

1. Authenticated quote route loads the current server cart.
2. Products/variants are reloaded and package measurements calculated server-side.
3. Serviceability/rates are normalized into Standard and Express customer choices.
4. A random quote ID and expiry are stored with exact cart/user/payment/package/cost snapshots.
5. Checkout sends only the quote ID/selected option.
6. Server reloads and validates ownership, expiry, cart fingerprint, amount, payment mode, and package snapshot.
7. Order stores the validated quote snapshot/ID.
8. Trusted payment settlement or admin-confirmed COD enqueues provider order creation.

When logistics is disabled, the existing fixed-rate checkout remains available. When enabled, missing production measurements fail visibly; they are never guessed.

## Background jobs

Use a durable Mongo job record with a unique dedupe key and Redis expiring distributed lock. A separate worker:

- atomically leases due jobs;
- caps attempts;
- applies exponential backoff/jitter;
- classifies permanent errors;
- records sanitized errors and audit entries;
- supports safe restart after lease expiry;
- exposes failed jobs in the admin control center.

Jobs include create order, assign AWB, pickup, documents, tracking reconciliation, cancellation, return, exchange, and notification dispatch.

## Webhook design

- Public path is provider-neutral.
- `x-api-key` is timing-safe compared with `SHIPROCKET_WEBHOOK_SECRET`.
- Body is size-limited and Zod validated.
- Shipment lookup uses AWB, provider order ID, then provider shipment ID.
- Fingerprint is uniquely persisted.
- Raw status is retained; normalized status is centralized.
- Transition rules reject terminal downgrade and tolerate out-of-order scans.
- Tracking scans are deduplicated and bounded.
- Non-trivial processing is queued and the endpoint returns HTTP 200 quickly.

## Test strategy

- Unit: config/mode guards, token cache/single-flight/401, retry/timeout, redaction, package validation, quote expiry/fingerprint, status transitions, idempotency, analytics, NDR/RTO/return/exchange transitions.
- Integration: authenticated quotes, stale/manipulated quote, ownership, admin RBAC, duplicate mutations, webhook auth/dedupe/order, paid-provider-outage behavior.
- Frontend: serviceability states, checkout options, expiry/retry, logistics table/actions, analytics filters, management workflows, tracking, accessibility/responsiveness.
- E2E: mock prepaid, COD, outage, NDR, RTO, return, and exchange flows.
- Builds and a post-build secret scan.

`npm run verify:logistics` must force mock mode and cannot contact a Shiprocket hostname.

The implemented verification command covers all workspace lint/type-check/tests/builds, focused enabled-mock logistics tests, and the built-bundle secret scan. Phase 2 added an exact-name isolated database seed plus deterministic Playwright coverage for prepaid settlement, provider retry, NDR, RTO, return, exchange, and document/print flows. It is wired into CI. The 2026-07-28 local execution was blocked before tests started by unavailable local-socket approval, so no green local Playwright result is claimed.

## Environment variables

```env
LOGISTICS_PROVIDER=shiprocket
SHIPROCKET_ENABLED=false
SHIPROCKET_MODE=mock
SHIPROCKET_ALLOW_LIVE_READS=false
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
SHIPROCKET_API_EMAIL=
SHIPROCKET_API_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=
SHIPROCKET_PICKUP_POSTCODE=
SHIPROCKET_WEBHOOK_SECRET=
SHIPROCKET_REQUEST_TIMEOUT_MS=12000
SHIPROCKET_TOKEN_REFRESH_BUFFER_SECONDS=3600
SHIPROCKET_AUTO_CREATE_ORDER=false
SHIPROCKET_AUTO_ASSIGN_AWB=false
SHIPROCKET_AUTO_SCHEDULE_PICKUP=false
LOGISTICS_QUOTE_TTL_SECONDS=900
LOGISTICS_PACKAGING_WEIGHT_KG=0.1
LOGISTICS_WORKER_ENABLED=false
LOGISTICS_WORKER_POLL_MS=5000
```

Credentials remain blank in examples.

## Live smoke and cleanup

The read-only smoke script requires:

```text
SHIPROCKET_MODE=live-readonly
SHIPROCKET_ALLOW_LIVE_READS=true
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
```

Mutation commands additionally require live mode, mutation permission, and `--confirm-live-account`. Test order IDs use `CRUISIN-INTEGRATION-TEST-<timestamp>`. Neither mutation nor cleanup runs automatically.

## Rollback

1. Set `SHIPROCKET_ENABLED=false` and all live/auto flags false.
2. Stop the logistics worker.
3. Keep shipment/quote/audit/job collections for reconciliation; do not drop data.
4. Storefront falls back to existing fixed shipping rates.
5. Hide logistics navigation if required without removing order/payment data.
6. Revert application code only after outstanding paid orders and provider shipments are reconciled.

No rollback step changes or deletes Razorpay payments, orders, or inventory automatically.
