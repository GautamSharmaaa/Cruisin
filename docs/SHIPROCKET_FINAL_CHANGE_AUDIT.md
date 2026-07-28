# Shiprocket Final Change Audit

## Audit basis

- Branch: `main`
- Revision: `744639e` (`enhacements 0.2`)
- Comparison: committed `HEAD` versus the complete current working tree, including untracked files.
- Status: the Shiprocket integration and its supporting QA work are uncommitted.
- Unrelated changes: no file can be proven accidental from the diff. Product-form changes map to parcel data, authentication changes map to notification preferences, and dependency/CI changes map to hardening. `docs/CODEBASE_ARCHITECTURE_AUDIT.md` is broader than Shiprocket but is an intentional precursor audit; it should be reviewed separately before a future commit.

Coverage labels below describe existing executable evidence, not a pass result for this QA run. Results are recorded only in `SHIPROCKET_COMPLETE_QA_REPORT.md`.

| File | Purpose | Main behaviour changed | Security impact | Test coverage |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI hardening | Adds logistics verification, browser matrix and isolated index validation | Prevents unsafe database targeting in CI | CI definition; local command parity |
| `docker-compose.yml` | Local dependencies | Adds local Redis alongside MongoDB | Keeps E2E off remote Redis | E2E runtime |
| `package.json` | Root orchestration | Adds Node 22, logistics verification and E2E scripts | Forces mock/live-off verification flags | Commands executed in final QA |
| `package-lock.json` | Dependency resolution | Locks hardened Next, Mongoose, PostCSS and Sharp tree | Supply-chain/audit surface | `npm ci`, audit, builds |
| `admin/package.json` | Admin dependencies | Pins hardened build dependencies | Supply-chain surface | Admin build/test |
| `client/package.json` | Client dependencies | Adds Playwright and hardened build dependencies | Browser-test and supply-chain surface | Client build/test/Playwright |
| `server/package.json` | Server scripts/dependencies | Adds worker, smoke, index and logistics scripts | Separates mock/read-only/live operations | Server tests/build/scripts |
| `server/tsconfig.json` | Server compilation | Includes worker entry point | Ensures worker receives strict type checking | Typecheck/build |
| `server/.env.example` | Configuration contract | Documents Shiprocket, automation, notification and document flags | Defaults dangerous operations off | Environment audit |
| `server/src/config/env.ts` | Environment validation | Validates provider modes, credentials, automation and channel flags | Rejects contradictory live/mutation settings | Config exercised by all server suites |
| `server/src/config/logistics.ts` | Provider configuration | Exposes normalized logistics configuration | Centralizes live-operation gates | Logistics unit/E2E |
| `server/src/config/redis.ts` | Job storage | Supports isolated Redis DB selection | Prevents accidental shared E2E Redis state | Worker/E2E |
| `server/logistics-worker.ts` | Durable worker | Runs guarded logistics job polling | Mutations depend on provider/config gates | Automation/E2E |
| `server/src/types/logistics.types.ts` | Provider-neutral types | Defines quotes, parcels, tracking and provider operations | Reduces provider-shape leakage | Typecheck/provider tests |
| `server/src/models/model-registry.ts` | Index registry | Registers all logistics models | Ensures indexes are explicitly created | Index validation |
| `server/src/models/shipment.model.ts` | Shipment persistence | Stores provider IDs, AWB, package, documents, NDR and RTO; optional provider identifiers use partial unique indexes so multiple drafts can coexist | Unique IDs without the compound-sparse `null` collision | Core/index/E2E |
| `server/src/models/logistics-quote.model.ts` | Quote persistence | Stores customer/cart-bound expiring quotes | TTL and ownership binding | Quote/index/E2E |
| `server/src/models/logistics-job.model.ts` | Durable jobs | Stores dedupe, lease, retry and terminal state | Prevents duplicate/replayed mutations | Automation/index/E2E |
| `server/src/models/logistics-webhook-event.model.ts` | Webhook ledger | Stores fingerprint and processing status | Replay protection | Webhook/index/E2E |
| `server/src/models/logistics-notification-event.model.ts` | Notification ledger | Stores semantic event and channel deliveries | Dedupes delivery and sanitizes failures | Notification/index tests |
| `server/src/models/logistics-audit.model.ts` | Operations audit | Records actor/action/correlation metadata | Admin accountability | Route/service/E2E |
| `server/src/models/package-preset.model.ts` | Packaging policy | Stores reusable package dimensions and limits | Server-controlled parcel calculation | Package/service coverage |
| `server/src/models/return-request.model.ts` | Return workflow | Stores idempotent return state machine | Prevents duplicate workflow actions | Return/E2E |
| `server/src/models/exchange-request.model.ts` | Exchange workflow | Stores replacement and reservation state | Prevents duplicate inventory reservation | Exchange/E2E |
| `server/src/models/order.model.ts` | Order logistics fields | Adds quote/shipping/payment/logistics linkage | Keeps settlement independent from fulfilment | Checkout/payment/E2E |
| `server/src/models/product.model.ts` | Parcel source data | Adds product/variant weight, dimensions and packaging | Makes server authoritative for parcel values | Validator/service tests |
| `server/src/models/user-preference.model.ts` | Channel preferences | Adds order-email preference | Enforces customer communication choices | Auth/notification tests |
| `server/src/controllers/logistics.controller.ts` | Logistics HTTP boundary | Exposes quote, shipment, document, NDR and RTO operations | Authentication/RBAC and safe errors | Security routes/E2E |
| `server/src/controllers/logistics-webhook.controller.ts` | Webhook boundary | Validates API key and payload | Constant-time credential check and bounded input | Webhook routes/replay |
| `server/src/controllers/return-exchange.controller.ts` | Workflow HTTP boundary | Exposes return/exchange actions | Ownership and role enforcement | Return/exchange E2E |
| `server/src/controllers/order.controller.ts` | Checkout boundary | Accepts logistics quote and package-safe checkout fields | Ignores client-authoritative charges | Checkout tests/E2E |
| `server/src/routes/v1/index.ts` | API registration | Mounts logistics, webhook, return and exchange routes | Preserves middleware boundaries | Route tests |
| `server/src/routes/v1/logistics.routes.ts` | Logistics routing | Defines customer/admin logistics endpoints | Explicit authentication and roles | Security routes/E2E |
| `server/src/routes/v1/logistics-webhook.routes.ts` | Webhook routing | Defines provider webhook endpoint | Raw boundary and API-key validation | Webhook routes |
| `server/src/routes/v1/return-exchange.routes.ts` | Workflow routing | Defines customer and admin workflow endpoints | Ownership/RBAC | E2E |
| `server/src/routes/v1/order.routes.ts` | Order routing | Adds logistics-aware order operations | Customer ownership checks | Checkout/order tests |
| `server/src/routes/v1/logistics-security.routes.test.ts` | RBAC regression | Tests anonymous, customer, viewer and manager access | Guards admin operations/documents | Focused suite |
| `server/src/routes/v1/logistics-webhook.routes.test.ts` | Webhook regression | Tests credentials and invalid payloads | Guards webhook boundary | Focused suite |
| `server/src/validators/logistics.validator.ts` | Logistics validation | Validates quotes, parcels, filters and actions | Rejects mass assignment and malformed input | Route/service tests |
| `server/src/validators/order.validator.ts` | Checkout validation | Adds quote and shipping method fields | Restricts manipulated checkout input | Checkout tests |
| `server/src/validators/product.validator.ts` | Parcel validation | Validates weight/dimensions/presets | Rejects zero, negative and oversized values | Validator tests |
| `server/src/validators/auth.validator.ts` | Preference validation | Adds order-email preference | Restricts preference payload | Auth tests |
| `server/src/services/logistics/logistics-provider.ts` | Provider contract | Defines provider-neutral methods | Prevents UI/API dependence on Shiprocket payloads | Typecheck/mock tests |
| `server/src/services/logistics/provider-factory.ts` | Provider selection | Chooses mock or Shiprocket adapter | Enforces configured mode | Core/E2E |
| `server/src/services/logistics/mock-logistics-provider.ts` | Deterministic provider | Implements serviceability, order, AWB, pickup, docs, tracking and failure fixtures | Guarantees no external call | Core/E2E |
| `server/src/services/logistics/shiprocket-client.ts` | HTTP client | Adds auth cache, refresh, retry, timeout and sanitization | Protects credentials and bounds retries | Core/client coverage |
| `server/src/services/logistics/shiprocket-provider.ts` | Live adapter | Normalizes Shiprocket requests/responses | Validates provider payloads and live gates | Typecheck/read-only smoke |
| `server/src/services/logistics/package-calculator.ts` | Parcel calculation | Recalculates weight/dimensions from catalog and quantities | Rejects browser-authoritative parcel data | Core/checkout coverage |
| `server/src/services/logistics/logistics-quote.service.ts` | Quote lifecycle | Creates and consumes cart/customer/payment-bound quotes | TTL, stale-cart and ownership protection | Core/E2E |
| `server/src/services/logistics/logistics.service.ts` | Shipment lifecycle | Handles provider order, AWB, pickup, documents, tracking, NDR and RTO | Idempotency, audit and state guards | Core/E2E |
| `server/src/services/logistics/logistics-job.service.ts` | Durable execution | Claims, retries and dead-letters logistics jobs | Lease/dedupe/retry boundaries | Automation/E2E |
| `server/src/services/logistics/logistics-automation.service.ts` | Automation gates | Independently gates prepaid, COD, AWB and pickup | Disabled flags cannot cause hidden mutations | Automation tests |
| `server/src/services/logistics/logistics-status.ts` | Status normalization | Maps provider states to terminal-safe local states | Blocks status downgrade | Webhook/E2E |
| `server/src/services/logistics/logistics-webhook.service.ts` | Webhook processing | Matches shipments, dedupes and updates state | Replay and downgrade protection | Replay/routes/E2E |
| `server/src/services/logistics/logistics-notification.service.ts` | Event delivery | Builds 18 event templates and dispatches enabled channels | Preferences, dedupe and nonfatal sanitized errors | Notification tests/E2E |
| `server/src/services/logistics/return-exchange.service.ts` | Reverse logistics | Runs return/exchange state machines and inventory transitions | Idempotent reservation/restoration | E2E |
| `server/src/services/logistics/logistics-core.test.ts` | Core provider regression | Covers package/provider/idempotency basics | Tests safe failures | Focused suite |
| `server/src/services/logistics/logistics-automation.test.ts` | Automation regression | Covers prerequisite and independent flags | Guards unintended automation | Focused suite |
| `server/src/services/logistics/logistics-index-contract.test.ts` | Index contract | Verifies 12 critical index declarations | Detects missing uniqueness/TTL | Focused suite |
| `server/src/services/logistics/logistics-notification-core.test.ts` | Template regression | Covers 18 event definitions and sanitization | Prevents unsafe notification content | Focused suite |
| `server/src/services/logistics/logistics-notification-dispatch.test.ts` | Channel regression | Covers preferences, disabled channels, failures and dedupe | No real outbound provider | Focused suite |
| `server/src/services/logistics/logistics-webhook-replay.test.ts` | Replay regression | Covers delivered replay and single notification | Prevents duplicate state/notification | Focused suite |
| `server/src/services/logistics/shiprocket-client.contract.test.ts` | HTTP-client contract QA | Covers auth caching/coalescing, refresh, timeout, retries, malformed responses and mutation refusal | Uses mocked Axios; proves no live request | Final QA contract suite |
| `server/src/services/logistics/mock-logistics-provider.contract.test.ts` | Mock-provider contract QA | Covers every provider-neutral mock operation and deterministic failure fixture | No network; idempotency and safe errors | Final QA contract suite |
| `server/src/services/logistics/package-calculator.contract.test.ts` | Parcel-authority QA | Covers product/variant overrides, quantities, presets, invalid/oversized data and stripped client charges | Proves server-owned package calculation | Final QA contract suite |
| `server/src/services/logistics/logistics-quote.contract.test.ts` | Quote security QA | Covers pincode validation, ownership, expiry, cart/catalog staleness, payment/address mismatch and option manipulation | Binds quotes to current server-owned price and parcel data | Final QA contract suite |
| `server/src/services/logistics/logistics-webhook.contract.test.ts` | Webhook ordering QA | Covers identifier lookup, unmatched events, terminal downgrades, unknown states, scan dedupe, NDR and RTO | Prevents replay/downgrade corruption | Final QA contract suite |
| `server/src/services/auth.service.ts` | Preference persistence | Reads/writes order-email preference | Customer-controlled notification channel | Auth tests |
| `server/src/services/order.service.ts` | Settlement/checkout integration | Starts logistics only after trusted payment/COD placement | Captured payment survives logistics failure | Checkout/E2E |
| `server/src/utils/send-email.ts` | Email adapter | Defers SendGrid initialization until a production send | Tests cannot initialize or send through SendGrid | Notification/routes tests |
| `server/src/utils/send-logistics-message.ts` | SMS/WhatsApp adapters | Wraps Twilio channel delivery | Production/channel gates and normalized recipients | Adapter tests |
| `server/src/utils/send-logistics-message.test.ts` | Adapter regression | Tests SMS sender and WhatsApp normalization | Uses mocked Twilio only | Focused suite |
| `server/src/utils/logger.ts` | Structured log redaction | Redacts credential and customer-contact fields by key | Prevents token, address, email, phone and recipient leakage | Static security audit and regression suite |
| `server/src/scripts/ensure-indexes.ts` | Isolated index validation | Refuses nonlocal/nonexact targets and verifies 12 indexes | No database/index drop; credentials not logged | Real isolated DB run |
| `server/src/scripts/seed-logistics-e2e.ts` | E2E fixtures | Guards and resets only the exact local E2E DB/Redis DB 15 | Refuses live provider and remote services | Playwright global setup |
| `server/src/scripts/shiprocket-live-smoke.ts` | Read-only account smoke | Authenticates and checks pickup/rates only | Requires explicit read-only confirmation and mutation-off flags | Manual guarded stage |
| `server/src/scripts/shiprocket-live-cleanup.ts` | Future cleanup utility | Supports controlled-test cleanup | Live mutation gated; not authorized in this QA | Not executed |
| `scripts/verify-logistics-secrets.mjs` | Bundle scanner | Scans built frontend assets for provider secrets | Prevents client credential leakage | Root verification |
| `client/playwright.logistics.config.ts` | Browser matrix | Starts isolated API/worker/admin with mock flags | Local DB/Redis and outbound channels disabled | Eight Playwright tests |
| `client/e2e/logistics-global-setup.ts` | E2E setup | Runs guarded seed from repository root | Cannot seed without exact safety flags | Playwright |
| `client/e2e/logistics-matrix.spec.ts` | End-to-end API workflows | Covers prepaid, outage, NDR, RTO, return and exchange | Tests replay, idempotency and payment safety | Playwright |
| `client/e2e/logistics-documents.spec.ts` | Admin browser documents | Covers generate/print/failure UI | Mocked API; no real document/provider call | Playwright |
| `client/hooks/useLogistics.ts` | Storefront data access | Fetches quotes and tracking | Uses authenticated API contract | Browser/typecheck |
| `client/hooks/useCheckout.ts` | Checkout state | Carries logistics quote/method | Does not trust client charges | Client tests/E2E |
| `client/components/checkout/delivery-serviceability.tsx` | Quote UI | Shows postcode, courier, price and ETA states | Customer-safe provider errors | Browser/E2E |
| `client/components/checkout/shipping-method.tsx` | Shipping choice | Displays provider-backed options | Server verifies selection | Client/browser |
| `client/components/checkout/order-summary.tsx` | Totals UI | Displays selected shipping/COD totals | Display only; server recalculates | Client/browser |
| `client/app/(shop)/checkout/page.tsx` | Checkout flow | Integrates quote invalidation and payment mode | Stale quote recovery | Client/E2E |
| `client/components/account/shipment-tracking.tsx` | Tracking UI | Displays courier, AWB and scan timeline | Authenticated ownership boundary | Browser/API tests |
| `client/app/(shop)/account/orders/[id]/tracking/page.tsx` | Tracking route | Adds customer shipment page | Order ownership via API | Browser/security |
| `client/app/(shop)/account/orders/[id]/page.tsx` | Order detail | Links shipment/return/exchange actions | Customer-scoped data | Client/browser |
| `client/app/(shop)/account/preferences/page.tsx` | Notification preferences | Adds order email/in-app/SMS/WhatsApp controls | Explicit customer choice | Client/auth tests |
| `client/constants/copy.ts` | Customer copy | Adds safe shipping and preference labels | Avoids raw provider errors | UI review |
| `client/types/order.types.ts` | Order DTO | Adds logistics fields | Typed boundary | Typecheck |
| `client/types/user.types.ts` | Preference DTO | Adds order-email preference | Typed boundary | Typecheck |
| `admin/hooks/useLogistics.ts` | Admin data/actions | Fetches logistics, documents, analytics and notifications | Authenticated admin API | Browser/typecheck |
| `admin/components/logistics/logistics-control-center.tsx` | Operations dashboard | Adds KPIs, search, shipment actions and document print | Role-gated backend operations | Playwright/manual QA |
| `admin/components/logistics/logistics-analytics.tsx` | Logistics analytics | Displays shipment cost/performance metrics | Admin-only financial view | Manual QA |
| `admin/components/logistics/ndr-manager.tsx` | NDR operations | Adds contact, reattempt, escalation and RTO actions | Audit/RBAC through API | E2E/manual QA |
| `admin/components/logistics/rto-manager.tsx` | RTO operations | Adds receipt and inspection actions | Exactly-once inventory recovery | E2E/manual QA |
| `admin/components/logistics/returns-manager.tsx` | Return queue | Adds return lifecycle actions | Admin-only workflow | E2E/manual QA |
| `admin/components/logistics/exchanges-manager.tsx` | Exchange queue | Adds exchange lifecycle actions | Inventory reservation protection | E2E/manual QA |
| `admin/components/logistics/order-shipping-panel.tsx` | Order shipment panel | Shows/prepares shipment from order detail | Manual creation is role protected | Admin tests/manual QA |
| `admin/app/(dashboard)/logistics/page.tsx` | Dashboard route | Mounts logistics control center | Auth guard | Browser QA |
| `admin/app/(dashboard)/logistics/analytics/page.tsx` | Analytics route | Mounts logistics analytics | Auth guard | Browser QA |
| `admin/app/(dashboard)/logistics/ndr/page.tsx` | NDR route | Mounts NDR manager | Auth guard | Browser QA |
| `admin/app/(dashboard)/logistics/rto/page.tsx` | RTO route | Mounts RTO manager | Auth guard | Browser QA |
| `admin/app/(dashboard)/returns/page.tsx` | Returns route | Mounts return queue | Auth guard | Browser QA |
| `admin/app/(dashboard)/exchanges/page.tsx` | Exchanges route | Mounts exchange queue | Auth guard | Browser QA |
| `admin/components/dashboard/sidebar.tsx` | Navigation | Adds logistics, NDR, RTO, returns and exchange links | Visibility remains behind auth guard | Admin tests/manual QA |
| `admin/components/dashboard/order-detail-client.tsx` | Order operations | Adds shipping panel | Backend RBAC remains authoritative | Admin tests/manual QA |
| `admin/components/products/product-form.tsx` | Parcel catalog UI | Adds weight/dimension/packaging inputs | Server validation required | Admin tests/typecheck |
| `admin/lib/product-payload.ts` | Product serialization | Sends parcel fields | Schema strips/rejects invalid values | Admin tests |
| `admin/lib/schemas.ts` | Product form schema | Validates parcel values client-side | Defense in depth only | Admin tests |
| `admin/types/dto.types.ts` | Admin DTOs | Adds parcel/logistics fields | Typed boundary | Typecheck |
| `docs/CODEBASE_ARCHITECTURE_AUDIT.md` | Precursor audit | Records broader architecture findings | Identifies security risks | Documentation only |
| `docs/LOGISTICS_ADMIN_DASHBOARD.md` | Admin guide | Documents logistics operations | Clarifies permissions and print limitations | Documentation review |
| `docs/SHIPROCKET_COMPLETION_REPORT.md` | Phase 1 record | Records historical implementation state | Avoids treating history as current proof | Documentation review |
| `docs/SHIPROCKET_IMPLEMENTATION_PLAN.md` | Delivery plan | Maps rollout and remaining stages | Stages mutation enablement | Documentation review |
| `docs/SHIPROCKET_INTEGRATION.md` | Integration guide | Documents architecture and configuration | Captures safety flags | Documentation review |
| `docs/SHIPROCKET_LOCAL_TESTING.md` | Local QA guide | Documents mock/local test workflow | Avoids remote dependencies | Documentation review |
| `docs/SHIPROCKET_PHASE2_GAP_AUDIT.md` | Pre-edit gap record | Captures hardening gaps | Historical evidence boundary | Documentation review |
| `docs/SHIPROCKET_PHASE2_HARDENING.md` | Phase 2 record | Captures implemented hardening and evidence | Separates verified/unverified claims | Documentation review |
| `docs/SHIPROCKET_PRODUCTION_CHECKLIST.md` | Release checklist | Lists safe activation requirements | Keeps mutations and notifications off until ready | Documentation review |
| `docs/SHIPROCKET_TROUBLESHOOTING.md` | Operations guide | Documents common provider/worker failures | Avoids unsafe recovery actions | Documentation review |
| `docs/SHIPROCKET_MANUAL_BROWSER_QA.md` | Manual QA evidence | Records observed, failed and blocked storefront/admin scenarios and screenshot paths | Prevents automated-only evidence being reported as manual | Headed browser observations |
| `docs/SHIPROCKET_COMPLETE_QA_REPORT.md` | Final release evidence | Consolidates commands, durations, defects, index state and release decision | Preserves live-stage gate and no-deploy/no-mutation evidence | All final QA stages |

## Initial unrelated-change assessment

No changed source file is presently classified as accidental. The broader architecture audit is the only file outside the narrow Shiprocket feature surface. Because the worktree predates this final QA and remains uncommitted, a future commit should deliberately choose whether to include that audit rather than sweeping all files into one commit.
