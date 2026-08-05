# Cruisin Codebase Architecture Audit

Audit date: 2026-07-27  
Repository revision: `744639e` (`main`)  
Audit scope: repository structure, backend, storefront, admin, commerce lifecycle, data models, security, tests, and Shiprocket integration boundaries.

## Executive summary

Cruisin is an npm-workspaces monorepo with three TypeScript applications:

- `client`: Next.js 15 App Router storefront on port 3000.
- `admin`: separate Next.js 15 App Router admin application on port 3001.
- `server`: Express 5 API under `/api/v1` on port 8000.

MongoDB/Mongoose is the system of record. Redis is required for refresh-token sessions, one-time tokens, and distributed rate-limit counters. There is no queue framework or logistics integration. Razorpay is the primary online payment provider; Stripe support exists but is not exposed by the current storefront. React Query is used for server state in both frontends and Zustand is used for storefront auth/cart/wishlist state.

The existing payment path deliberately preserves captured payments when inventory settlement cannot complete. Shiprocket must follow the same safety property: logistics failure must leave a paid order durable and create a visible retryable fulfilment task. Shipment state must remain separate from `paymentStatus` and `orderStatus`.

No genuine blocker requiring production data mutation or a payment/inventory rewrite was found. The integration can be added behind disabled-by-default feature flags and mock mode.

## Repository and tooling

### Structure

| Path | Purpose |
| --- | --- |
| `client/` | Storefront pages, components, React Query hooks, Zustand stores, Playwright tests |
| `admin/` | Admin pages, operational components, React Query hooks, analytics UI |
| `server/` | Express bootstrap, routes, controllers, services, Mongoose models, scripts, tests |
| `docs/` | Deployment, payment reconciliation, rollback, readiness, and QA documentation |
| `.github/workflows/ci.yml` | Mongo/Redis-backed CI verification |
| `docker-compose.yml` | Local MongoDB 7 only |
| `railway/`, `render.yaml`, `vercel.json` | Deployment descriptors |
| `test-fixtures/`, `server/test-fixtures/` | Catalogue and analytics fixtures |

Generated `.next/` and `dist/` artifacts exist locally but are not architecture sources. No tracked `.env` file, private key, or credential file was found. The worktree was clean before implementation.

### Package and build facts

- Package manager: npm 11.12.1 with lockfile version 3.
- Workspace root: `client`, `admin`, `server`.
- Declared Node runtime: 22.x. Audit host runtime: Node 25.9.0.
- Installed TypeScript: 5.9.3.
- Next.js: 15.5.19; React: 19.
- Express: 5.2.1.
- Mongoose: 8.24.0.
- Redis client: ioredis 5.11.1 plus an internal Upstash REST adapter.
- Unit/integration runner: Vitest 4.1.9.
- E2E runner: Playwright 1.61.0.
- Formatting: no formatter command/configuration.
- Linting: each workspace currently aliases lint to TypeScript type checking; there is no active ESLint command.
- Queue: none.

Root commands:

```text
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Backend architecture

### Request flow

```text
HTTP request
→ Helmet / CORS
→ raw-body middleware for payment webhooks
→ JSON and URL-encoded parsers
→ cookie parser
→ Mongo operator sanitizer
→ request logging
→ global Redis-backed rate limiter
→ `/api/v1` router
→ auth / admin role / Zod validation middleware
→ controller wrapped by `asyncHandler`
→ service
→ Mongoose / Redis / payment provider
→ `ApiResponse`
→ centralized error handler
```

`server/index.ts` connects MongoDB and Redis before binding. It implements bounded Mongo connection retries and graceful shutdown. Readiness verifies both dependencies. Controllers are generally transport-only and database access is concentrated in services.

### Security middleware

- Helmet is enabled; production CSP is configured.
- Browser CORS is restricted to the configured client/admin origins.
- Cookie-auth login, refresh, logout, Google admin login, and OTP verification enforce browser-origin checks.
- Access tokens are bearer JWTs; refresh tokens are HttpOnly cookies and their hashes are stored in Redis and `UserSession`.
- Refresh-token rotation detects token-family reuse.
- General, auth, OTP, and upload rate limiters use Redis.
- Zod validates most request bodies and params.
- Mongo operator keys are stripped from request body, params, and query.
- Errors are normalized; stack traces are not returned to clients.
- Winston redacts keys matching authorization/card/cookie/credential/password/secret/signature/token and bearer/Mongo credentials in strings.

### Redis and jobs

The Redis abstraction supports `get`, expiring `set`, delete, decrement, ping, and an atomic rate-limit increment. It works with ioredis or Upstash REST. It is used for:

- refresh-token session keys;
- email verification/reset tokens;
- rate-limit counters.

There is no BullMQ, worker, durable job collection, dead-letter view, scheduling, or retry audit. The current Upstash REST adapter is not a BullMQ-compatible Redis connection. The logistics design should therefore add a small durable job collection plus Redis distributed locks/deduplication, and run it from a separate worker entry point.

## Storefront architecture and workflow

### App structure

The storefront uses Next.js App Router route groups:

- `(auth)`: login, registration, verification, password reset.
- `(shop)`: homepage, listings, PDP, cart, checkout, account, orders, and legal content.

React Query is configured in `components/shared/providers.tsx`. The central Axios client adds bearer tokens and device fingerprints and performs single-flight refresh-token recovery. Zustand persists the cart and wishlist locally; auth access tokens remain in memory.

### Cart and checkout

The browser cart is a Zustand snapshot. Before checkout, `useCheckout` synchronizes visible local cart items to the server cart. The API reloads the server cart, current products, and variants, recalculates prices, validates stock, recalculates discounts, and calculates a fixed standard/express shipping rate from `SiteSettings`.

Current storefront flow:

```text
Authenticated customer
→ address form
→ fixed Standard/Express choice
→ Razorpay/COD/partial choice
→ browser cart synchronized to API cart
→ API recalculates items, discount, shipping, total
→ local order created with checkout UUID
→ Razorpay order created OR COD order placed
```

The current browser-calculated shipping amount is presentation-only; the backend recalculates it. There is no pincode serviceability request, courier quote, quote ID, quote expiry, COD-by-pincode decision, or package calculation.

### Razorpay flow

```text
API creates local pending order
→ API creates Razorpay order and stores provider order ID
→ browser opens Razorpay Checkout
→ browser posts signature payload to trusted API
→ API verifies HMAC and ownership
→ API acquires payment settlement guard
→ API atomically decrements each Product variant stock
→ API marks payment paid and order confirmed
→ cart deleted and confirmation email attempted
```

Razorpay webhooks are raw-body verified and deduplicated through a unique `(provider,eventId)` document. `payment.captured` and `order.paid` enter the same settlement function, preventing routine duplicate stock deductions. If payment is captured but stock cannot be decremented, the order is retained with `authorized` payment state and an inventory-review timeline entry.

### COD flow

```text
API validates COD global flag/value ceiling
→ recalculates cart and fixed shipping
→ creates local `placed` / `cod_pending` order
→ decrements Product variant stock
→ deletes cart
→ confirms order
```

COD does not currently require admin confirmation, serviceability, fraud evaluation, or provider shipment confirmation.

### Customer order access

`GET /orders/:id`, payment status, and cancellation require authentication and compare the order owner to the JWT user ID. Admin access uses separate `/admin/orders/:id`. This is a sound IDOR boundary and must be reused for customer shipment tracking.

## Admin architecture and workflow

The admin is a separate App Router application protected by `AuthGuard`. Admin roles are `viewer`, `manager`, `admin`, and `superadmin`. The API, not hidden buttons, enforces permissions:

- all admin roles can read operational resources;
- manager/admin/superadmin can mutate catalog and order status;
- admin/superadmin can issue/refetch refunds and mark collection payments.

The dashboard shell provides a fixed responsive sidebar/topbar. Operational pages reuse cards, status pills, filters, responsive tables, loading/error routes, and React Query hooks. Orders are currently loaded as the latest 200 records without server pagination. The order detail page handles status updates, payment collection, cancellation/refund visibility, and order timeline.

Existing analytics are calculated from actual `Order`, `Product`, `Category`, `Collection`, and `User` documents. An unused `admin/lib/admin/analytics/mockData.ts` file contains historical presentation fixtures; it is not used by the live analytics page and must not be reused for logistics analytics.

There is no audit-log model, shipment detail panel, courier comparison, logistics page, NDR/RTO workflow, return dashboard, or exchange dashboard.

## Commerce and inventory lifecycle

```text
Product with embedded variants/stock
→ Zustand cart
→ server Cart
→ address
→ fixed site shipping
→ local Order
→ Razorpay/COD
→ Product.variants.stock decrement
→ order confirmation
→ manual admin processing/shipping/delivery
→ cancellation with compensating stock restore
→ optional Razorpay refund
```

Exact mutation points:

- Local online order: before Razorpay provider-order creation.
- Online inventory reduction: after trusted browser signature verification or verified payment webhook.
- COD order and inventory reduction: local order first, then inventory reduction.
- Razorpay order: after local order creation.
- Razorpay verification: HMAC in `RazorpayProvider.verifyPayment`.
- Razorpay webhook: raw HMAC in `PaymentController`, event dedupe in `OrderService`.
- Refund initiation: admin-only `POST /admin/orders/:id/refund`.
- Return approval/exchange: not implemented.
- Order status: guarded transition map in `OrderService.updateStatus`.

`InventoryModel` contains `stock` and `reserved`, but the live cart/checkout/order path uses embedded `Product.variants.stock`. This duplicate inventory representation can drift. Logistics must treat `Product.variants.stock` as the current authoritative source and must not introduce a third stock counter.

## Data-model audit

### Existing commerce models

- `User`: unique email; sparse unique phone/WhatsApp; embedded legacy addresses; role/status/session metadata.
- `Address`: referenced user address book with default-address indexes.
- `Product`: embedded variants and media; SKU uniqueness; weight and `dimensions.length/width/height` already exist at product level.
- `Inventory`: unique `(product,variant)` and SKU, but unused by checkout.
- `Cart`: user or session cart, TTL expiry, embedded product/variant references.
- `Order`: embedded immutable item/address snapshots, payment attempts, refunds, cancellation, and timeline.
- `Coupon`: unique code with activity/validity/usage counters.
- `PaymentWebhookEvent`: unique provider event key and redacted provider payload.
- `Notification`: user/audience notifications with read index.

### Missing models

There is no first-class `Shipment`, `ReturnRequest`, `ExchangeRequest`, `LogisticsQuote`, package preset, logistics webhook event, logistics job, or logistics audit log.

### Important existing constraints

- `Order.checkoutIdempotencyKey` is unique and sparse.
- `Order.orderNumber` is unique and sparse.
- payment-provider IDs are indexed but not unique.
- refunds have an idempotency key but no unique database constraint because they are embedded.
- order state conflates fulfilment into `orderStatus`; Shiprocket status must not overwrite payment state.
- product weight/dimensions permit zero, although logistics must reject zero/missing values.

## Security and reliability findings

### High

1. Inventory settlement is not transactional. Multi-item decrement uses sequential atomic updates plus compensation. A process crash between writes can leave partial stock deductions.
2. COD creates a durable placed order before stock reservation. A reservation failure can leave an order requiring manual cleanup.
3. Razorpay webhook dedupe is recorded before event processing. If processing throws after the event insert, a provider retry is treated as a duplicate and will not retry processing.
4. Embedded refund idempotency is checked before the remote refund call without a database-level claim. Concurrent requests can race into duplicate provider calls.

These are pre-existing risks. The logistics implementation must not widen them. Logistics mutations require their own unique idempotency claims, durable errors, and retry visibility.

### Medium

1. Orders have only `orderStatus`; fulfilment, shipment, return, and refund state are not cleanly separated.
2. Admin orders are capped at 200 and are not server-paginated/filterable.
3. Viewer access includes order customer PII; there is no field-level permission tier.
4. JWT role changes are not revalidated against MongoDB until token expiry.
5. No durable audit trail records admin before/after values.
6. No queue, reconciliation process, provider timeout policy, or failed-job dashboard exists.
7. Global rate limiting exists, but there are no logistics-specific limits.
8. The runtime used for this audit is Node 25 while deployment and CI require Node 22.

### Positive controls to preserve

- fixed payment provider URLs;
- backend-only secrets;
- raw-body webhook verification;
- timing-safe signature comparison;
- checkout ownership checks;
- unique checkout/event keys;
- server-side cart repricing;
- centralized error normalization;
- structured secret redaction;
- CSP/CORS/security headers;
- role middleware on backend mutations.

## Shiprocket integration points

1. Add validated environment configuration in `config/env.ts`; default disabled/mock.
2. Add a provider-neutral interface and factory; controllers never call Shiprocket HTTP directly.
3. Add a trusted package calculator that reloads Product/variant data.
4. Add signed, expiring server-side quote snapshots; checkout validates the quote rather than a browser amount.
5. Add a separate Shipment model and keep `paymentStatus`, `orderStatus`, `shipmentStatus`, `returnStatus`, and `refundStatus` separate.
6. After trusted prepaid settlement or admin-confirmed COD, enqueue an idempotent create-shipment job. Provider failure cannot fail payment settlement.
7. Add provider-neutral `/webhooks/logistics-events` before the `express.json` body is consumed, authenticate `x-api-key`, dedupe, normalize, and prevent terminal downgrade.
8. Add customer-owned tracking reads under order routes.
9. Add admin logistics, analytics, NDR, RTO, returns, and exchange routes protected by role middleware.
10. Add a separate worker and reconciliation script; do not run live mutations at startup or CI.

## Existing code to reuse

- `ApiError`, `ApiResponse`, `asyncHandler`, error middleware, logger/redactor.
- `requireAuth`, `requireAdmin`, `requireRole`, and Zod `validate`.
- Redis abstraction and Mongo scripts/index synchronization.
- server-side product/variant price and stock validation patterns.
- checkout UUID idempotency and payment settlement guard.
- React Query Axios clients and auth refresh.
- admin cards, tables, filters, status pills, page headers, shell, and responsive CSS variables.
- existing real-data analytics style and date range conventions.

## Existing code not to rewrite

- Razorpay signature/payment/refund implementation.
- online and COD stock settlement logic, except for a narrow post-settlement logistics enqueue hook.
- auth/session/role implementation.
- product/catalogue/CMS/merchandising modules.
- existing order transition semantics.
- fixed-rate fallback utilities while the logistics feature flag is disabled.
- deployment configuration activation values.

## Baseline verification

All results below were recorded before application-code changes.

| Command | Result |
| --- | --- |
| `npm run lint` | Passed in all 3 workspaces |
| `npm run typecheck` | Passed in all 3 workspaces |
| `npm test` in restricted sandbox | 85 passed, 31 route tests failed because Supertest could not bind an ephemeral socket (`EPERM`) |
| `npm test` outside socket restriction | Passed: server 116, client 37, admin 20; total 173/173 |
| `npm run build` | Passed: storefront, admin, server |
| `npm run test:e2e` against isolated local Mongo/Redis | 64 passed, 5 failed, 3 skipped (72 selected) |

Existing E2E failures:

- The same cross-browser smoke assertion failed in Chromium, mobile Chromium, Firefox, and WebKit because it expects an exact homepage `Cruisin` heading no longer rendered by the CMS homepage.
- One admin browser smoke failed because the test treats offline third-party asset failures as application errors.
- The three skips are conditional existing CMS/recently-viewed/mobile cases.

No baseline command contacted Shiprocket. E2E used database `cruisin-logistics-baseline`, local Redis, and mock Razorpay keys. The repository’s configured remote Atlas and Upstash services were deliberately not used.

## Recommended implementation sequence

1. Environment, types, provider interface, mock provider, and tested Shiprocket client.
2. Shipment/quote/job/audit/return/exchange models and indexes.
3. Package calculation, quote signing, status normalization, and analytics functions.
4. Customer quote/serviceability routes and checkout quote enforcement.
5. Idempotent admin shipment mutations and durable jobs.
6. Logistics webhook and reconciliation.
7. Admin logistics, order shipping panel, analytics, NDR/RTO, returns, exchanges.
8. Customer tracking timeline.
9. Unit/integration/frontend/E2E verification and secret scan.
10. Documentation, production checklist, and rollback plan. No deployment.

## Implementation verification addendum

The additive implementation completed the planned provider boundary, mock/live adapters, package/quote flow, checkout enforcement, Shipment/quote/job/audit/request models, worker, webhook, customer tracking, admin logistics/analytics/NDR/RTO/returns/exchanges, RBAC, tests, and runbooks.

Post-implementation automated verification:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed in all 3 workspaces |
| `npm run lint` | Passed in all 3 workspaces |
| `npm test` | Passed: server 131, client 37, admin 20; total 188/188 |
| focused logistics tests | Passed: 15/15 |
| `npm run build` | Passed: storefront, admin, server |
| built frontend Shiprocket secret scan | Passed |
| local isolated index creation | Passed for every registered model |
| `npm audit --omit=dev` | Failed: 4 production advisories (3 high, 1 moderate); fixes are available and dependency remediation is a release blocker |

Isolated browser/API verification used `cruisin-logistics-browser`, local Redis, mock Shiprocket, mock Razorpay keys, a local customer, and the seeded local admin. It verified:

- fresh-cart synchronization before quoting;
- prepaid and COD standard/express quote differences;
- quote-backed COD checkout and local shipment draft;
- provider order, AWB, pickup, tracking, and customer scan timeline;
- webhook authentication and replay dedupe;
- NDR listing and reattempt;
- RTO listing, warehouse receipt, inspection, and idempotent inventory recovery behavior;
- return approval → reverse pickup → warehouse/QC → refund-status closure;
- exchange reserve → reverse pickup → warehouse/QC → replacement shipment → closure;
- logistics analytics and return/exchange dashboard states at a 390 px viewport without horizontal overflow.

No Shiprocket request, live payment mutation, production database, production infrastructure change, deployment, or live cleanup was performed.

The final advisory scan identified existing vulnerable ranges in Next.js/PostCSS/sharp and Mongoose. They were not silently auto-upgraded because framework/database dependency changes need their own Node 22 regression pass. Production activation is blocked until those advisories are remediated and `npm audit --omit=dev` is clean or formally risk-accepted.
