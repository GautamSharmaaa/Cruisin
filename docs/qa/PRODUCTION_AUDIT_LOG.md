# Cruisin Production Audit Log

All timestamps use Asia/Kolkata unless noted otherwise. Secrets and account
passwords are intentionally omitted.

## 2026-07-11 — Phase 0: discovery

### Current phase

Repository, environment, and architecture discovery.

### Service status

- Storefront listener detected on TCP 3000 (PID recorded in local command output).
- Admin listener detected on TCP 3001 (PID recorded in local command output).
- Backend listener detected on TCP 8000 (PID recorded in local command output).
- Docker MongoDB 7 container `cruisin-mongo-1` is healthy on local port 27017.
- Process ownership, active DB name, payment mode, and HTTP health are not yet verified.

### Routes inspected

- Enumerated all Next.js `page.tsx`, `layout.tsx`, loading, error, and not-found files.
- Inspected initial Express middleware order and route-module registrations.
- Full per-endpoint inventory is in progress in `ROUTE_AND_FEATURE_INVENTORY.md`.

### Tests performed

- Read-only file inventory.
- Git status and commit inspection.
- Package-script and dependency inventory.
- Environment-variable name inventory without values.
- Git tracking check for sensitive-looking environment/credential files.
- Listener and Docker service inspection.

### Evidence collected

- Branch: `main`; commit: `ad1cb4272d7159e6d6d1ed00e7cc20d256d1baaf`.
- Working tree was clean at discovery start.
- Root scripts orchestrate the three workspaces.
- `.gitignore` excludes `.env`, `.env.*` except examples, credential CSV patterns,
  build output, logs, and Playwright results.
- No sensitive-looking environment or credential files were found in `git ls-files`.
- Backend middleware mounts Razorpay and Stripe raw-body webhook parsers before
  JSON parsing, followed by cookies, sanitization, logging, routing, 404, and
  centralized error handling.

### Bugs discovered

- None classified yet. No concern will be called a confirmed bug until reproduced.

### Fixes made

- None. Application code has not been modified.

### Regressions checked

- Not applicable yet.

### Blockers

- None yet. Safe-environment verification is the next gate.

### Next actions

1. Complete route/API/model/service and integration inventory.
2. Verify existing process command lines and working directories.
3. Sanitize and record the active DB host/name and Razorpay mode.
4. Check service health without performing writes.
5. Inspect existing tests and previous reports as historical evidence only.

## 2026-07-11 — Phase 1: safe environment gate

### Current phase

Safe local QA environment verification and automated baseline.

### Service status

- Storefront PID owns `client` as its working directory and serves HTTP 200 on
  `http://127.0.0.1:3000/`.
- Admin PID owns `admin` as its working directory and serves HTTP 200 on
  `http://127.0.0.1:3001/login`.
- API PID runs `server/index.ts` from `server` and `/health` returns HTTP 200.
- Active MongoDB URI was parsed without credentials: protocol `mongodb`, host
  `localhost`, port 27017, database `cruisin`.
- Runtime mode is development; payment mode is `test`; Razorpay key prefix is
  test-classified. Required provider and webhook secrets are present but were
  neither printed nor copied.

### Data safety

- The local database contains established catalogue, users, orders, CMS, and QA
  history. It will not be reset or broadly cleaned.
- Any new write will use a unique QA label/batch and only those records may be
  removed during cleanup.

### Browser evidence and blocker

- Connected to the explicitly requested Codex in-app browser.
- Direct navigation to both the storefront root and `/login` stalled before a
  rendered document/title became available, although independent HTTP probes
  returned 200.
- No visual, interaction, console, or network pass has been claimed. The browser
  route will be retried after automated/API checks; configured Playwright tests
  are separate automated evidence, not a substitute for in-app manual results.

### Next actions

1. Run tests, typechecks, dependency audit, and later production builds.
2. Complete static service/model/controller review and endpoint inventory.
3. Exercise unauthenticated and safe read-only API behavior.
4. Retry the in-app browser connection after baseline checks.

## 2026-07-11 — Phases 2–13: architecture, storefront, auth, orders, payments, Admin

- Completed static review of middleware, routes, models, services, cookies,
  origins, provider adapters, webhook raw bodies, upload paths, and deploy config.
- In-app browser covered storefront and Admin route/control families at desktop,
  tablet, and mobile widths. Customer/admin sessions survived simultaneous reloads.
- Proved object authorization and role boundaries with QA-labelled records.
- Completed real COD lifecycle `CR-MRGFJI0N-GU4U8` and reconciled UI/API/DB/Admin.
- Exercised a real Razorpay Test modal and failure route. Provider success remained
  blocked by merchant-method availability/OTP/netbank simulator behavior.
- Added checkout creation idempotency and manually proved two identical retries
  produced one DB row and one provider order.

## 2026-07-11 — Phases 14–20: analytics, security, accessibility, performance, SEO

- Reconciled deterministic Analytics batch `ANALYTICS_QA_BATCH_20260702181816`
  across DB/API/UI for four date windows, then replaced the limited dashboard with
  real comparisons, revenue/inventory/customer/payment tables, exports, and states.
- Closed session-cookie collision, login-origin CSRF, shared guest cart, CSV
  injection, upload-folder, webhook minimization, response-header, SEO, contrast,
  landmark, table overflow, failure-state, and image-host defects.
- Docker pause reproduced dependency loss: `/health` 200, `/ready` 503; after
  MongoDB restart `/ready` returned 200. Production SIGINT logged graceful shutdown.
- Local production performance budgets passed on home/shop/PDP.
- A full-run homepage CLS spike reproduced the shared footer painting before
  streamed content. Reserving the page shell eliminated that movement: 15/15
  repeated performance checks passed before the final matrix.

## 2026-07-11 — Phases 21–25: compatibility, regression, production decision

- Installed Firefox and WebKit and added a supported non-mutating cross-browser contract.
- Final unit/service result: 65 server, 7 client, 10 Admin tests passed.
- Typecheck/lint/build passed for all workspaces; both npm audits found 0 vulnerabilities.
- Final Playwright matrix: 52 passed and 3 NA skips (55 total) over full desktop
  Chromium plus mobile Chromium/Firefox/WebKit smoke; unpublished CMS
  newsletter/recent modules and the project-inapplicable mobile-menu row are
  explicitly NA skips.
- The previously intermittent dynamic-category hydration flow passed three
  complete repetitions (9/9 tests) after request-scoped Query Clients and a
  deterministic hydration shell were added.
- All confirmed bugs in `BUG_REGISTER.md` passed focused and full regression.
- Created readiness, deployment, rollback, payment reconciliation, final report,
  completed inventory, test matrix, and blocker retest scripts.
- Final recommendation: **NO-GO** solely until EXT-PAY-001 and EXT-REF-001 are
  executed against a functioning Razorpay Test merchant flow.

## 2026-07-12 — Razorpay provider closure and final payment regression

### Provider diagnosis

- Reconfirmed `PAYMENT_MODE=test`, matching `rzp_test_*` client/server key
  classification, INR/paise totals, normalized contact/email, active callback and
  modal handlers, no application method restriction, and compatible CSP.
- Razorpay Dashboard required an account sign-in and no public staging webhook
  URL exists. Dashboard method/transaction inspection and actual delivery were
  not claimed.
- UPI was absent in the current checkout; current Razorpay documentation records
  UPI Collect deprecation and Dashboard method controls as Live-mode settings.
  The available Test Mobikwik wallet completed normally, proving the application
  integration was not the original stall source.

### Genuine payments

- Order `CR-MRHC585E-1GO3K`: provider order `order_TCTGXphBQ9TD4r`, payment
  `pay_TCTI9fqH0FyFTR`, captured ₹23,202 by Test Mobikwik. Signature verification
  returned 200; local paid/due became ₹23,202/₹0; one attempt, one stock
  decrement, confirmed order, cleared cart, matching storefront and Admin.
- Order `CR-MRHCZ4QH-FVTRU`: provider order `order_TCTf6hQZfsRb5d`, payment
  `pay_TCTfTED4bKKzuR`, captured ₹1,725 by Test Mobikwik. It independently
  reproduced one attempt, one decrement, verified callback, cleared cart, and
  paid/due ₹1,725/₹0.

### Genuine refunds and accounting

- Partial refund `rfnd_TCTYkvLAS96EdH` processed ₹5,000 against the first
  capture. Local status is `partially_refunded`, paid/refunded/due is
  ₹23,202/₹5,000/₹0, and both UIs show provider history.
- Razorpay generically rejected a second refund on that already-partially-refunded
  Test payment. Per the approved plan, a fresh captured order was used for the
  full-refund case rather than forcing provider state.
- Full refund `rfnd_TCTgePbxEheptX` processed ₹1,725 against the fresh capture.
  Provider status is `refunded`/full; local paid/refunded/due is
  ₹1,725/₹1,725/₹0; Admin/storefront agree.
- Analytics moved from refunds ₹0/net revenue ₹126,762 to refunds ₹5,000/net
  ₹121,762 after the partial. The fresh ₹1,725 sale and full refund netted to
  zero, leaving net ₹121,762 and refunds ₹6,725.
- Zero, negative, above-balance, COD, and customer/non-admin refund requests
  returned 400/403 without provider mutation. Same-key replays kept provider and
  DB refund counts at one; conflicting bodies returned 409.

### Webhook and concurrency evidence

- Provider payment/refund entities fetched from Razorpay were replayed locally
  through the raw-body endpoint with the configured HMAC secret. Valid events
  returned 200, invalid signature 401, duplicate event ID `processed:false`, and
  an unknown order was accepted without changing a known order.
- This is signed local replay, not Razorpay Dashboard delivery.
- Concurrent real verify and signed captured replay on the fully refunded order
  returned 200/200. Before/after stayed `refunded`, paid/refunded/due
  ₹1,725/₹1,725/₹0, one attempt, four timeline rows, stock 99.

### Fixes and regression

- Reconciled created/captured lifecycle into one payment attempt.
- Added refund UUID idempotency through Admin/API/provider, sanitized provider
  error mapping, provider-balance preflight, refund history/accounting, and
  terminal refund-state protection from late payment events.
- Full unit/service result: 72 server + 7 storefront + 10 Admin = 89 passed.
- Typecheck/lint and production builds passed in all workspaces.
- Manual final regression passed logged-out checkout prompt, Razorpay exit/failure
  recovery with cart retained, and COD order `CR-MRHD8MO2-M0P87` with paid ₹0,
  due ₹1,725.
- Payment-scoped Admin Chromium rerun passed 3/3 after restarting the final
  production artifacts. The deterministic analytics QA batch had already been
  deleted after reconciliation; provider payment/refund QA records were retained
  as audit evidence and must not be fulfilled.

### Final recommendation

**CONDITIONAL GO.** `EXT-PAY-001`, `EXT-REF-001`, PAY-002, PAY-006, and QG-010
are closed/passing. The sole external prerequisite is `EXT-WEB-001`: authenticate
to the matching Razorpay Dashboard and prove actual Test delivery to the final
public HTTPS webhook endpoint before traffic is enabled.
