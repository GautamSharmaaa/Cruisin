# Cruisin Bug Register

Final audit status, 2026-07-12. Every confirmed application defect below is
fixed and regressed. The provider payment/refund evidence gates are closed; the
remaining conditional prerequisite is real Dashboard delivery to a public HTTPS
webhook endpoint.

## Confirmed and resolved

| ID | Severity | Area | Reproduced defect / root cause | Resolution | Retest |
|---|---|---|---|---|---|
| PAY-001 | Critical | Payment settlement | Captured orders changed status without reconciling `amountPaid`/`amountDue`; partial orders pre-recorded uncaptured money | Reconcile captured attempt amount during serialized settlement; pending starts at zero paid | 19 focused order tests; COD UI/API/DB balance proof |
| PAY-002 | High | Checkout creation | Repeated checkout could create multiple local/provider orders | Required UUID attempt key, unique persisted index, same-cart session reuse, duplicate-key recovery | Browser submitted twice: one DB row and one provider order; focused reuse test |
| PAY-003 | High | Payment concurrency | Verify callback and webhook could reserve stock twice | Five-minute recoverable settlement lease and idempotent paid-state return | Concurrent Promise race: one settlement, one recoverable conflict, stock decremented once |
| PAY-004 | High | Payment attempts | A single created/captured provider lifecycle could be stored as two attempts | Reconcile the created placeholder in place and fold only the matching legacy duplicate | Both real captured orders have one attempt; verified replay kept attempt count one |
| PAY-005 | High | Refund creation | Admin retries had no provider idempotency key; an immediate provider result was not fully visible/reconciled | Required UUID key, Razorpay `X-Refund-Idempotency`, same-key body conflict guard, processed/pending accounting, refund history in both UIs | Real same-key replay: provider/DB refund count one, refund amount and timeline unchanged; changed body 409 |
| PAY-006 | High | Refund provider errors | Axios provider 400 responses became generic 500s and hid the safe provider reason | Map sanitized provider descriptions/status; preflight provider refundable balance and distinguish partial/full request bodies | Generic provider 400 now returned as 400; fresh-capture full refund processed for ₹1,725 |
| PAY-007 | High | Late payment events | A late verify/captured event could treat a refunded order as unsettled and overwrite refund state | Treat `partially_refunded` and `refunded` as terminal settlement states while still reconciling the matching attempt | Concurrent real verify + signed captured replay returned 200/200; refund totals, status, stock, attempt, and timeline unchanged |
| ORD-001 | High | Order lifecycle | Cancelled order accepted `shipped` | Explicit transition graph plus compare-and-update predicate | Cancelled/backward/stale transitions reject; valid transition passes |
| AUTH-001 | High | Session cookies | Admin and customer refresh sessions shared one cookie name | Origin-scoped `refreshToken` and `adminRefreshToken` issuance/rotation/revocation | Simultaneous full-reload sessions on both surfaces pass; evil origin 403 |
| CART-001 | High | Guest cart | Missing identity collapsed guests onto an empty shared session ID | Require customer/session identity; validate published/enabled product, cumulative stock, max quantity | Cart service tests and unauthenticated runtime checks |
| SEC-001 | High | CSV exports | Formula-capable values were only quoted | Neutralize `=`, `+`, `-`, `@`, tab, CR and leading whitespace across admin/server exports | 10 sanitizer tests; numeric negatives preserved |
| OPS-001 | High | Readiness | `/health` remained 200 while MongoDB was unavailable | Added dependency-aware `/ready`; retained liveness `/health`; graceful signals | Docker pause: health 200/readiness 503; recovery readiness 200; SIGINT logged |
| SEC-002 | Medium | Auth CSRF | Login/Google/OTP verification accepted non-browser origins | Browser-origin enforcement on credential-establishing endpoints | Auth route regressions and evil-origin 403 |
| SEC-003 | Medium | Upload/webhooks | Upload folder was not constrained; stored webhook payload contained unnecessary fields | Folder allowlist and minimized webhook audit projection | Focused route/service tests |
| SEC-004 | High | SSR request isolation | Storefront and Admin reused module-level React Query clients across server renders, allowing request cache state to bleed between renders and contributing to hydration instability | Instantiate one Query Client per mounted provider with lazy component state | Production builds, full route sweeps, dynamic-category repetition, and final Playwright matrix |
| UI-001 | Medium | Analytics mobile | Intrinsic table tracks expanded outside the mobile shell | `minmax(0,1fr)` containment and focusable horizontal scrollers | Manual 390/768 and automated overflow checks |
| UI-002 | Medium | User drawer | Long customer content expanded the fixed drawer beyond the viewport, hiding Close | Constrained dialog/grid min-width and overflow | Full Admin route/control sweep passes |
| UI-003 | Medium | Account addresses | Raw enum entry and immediate destructive deletion | Type select, default control, feedback, reset, two-step delete | Manual create/default/delete with API/DB corroboration |
| MEDIA-001 | Medium | Catalogue media | Legacy S3/placehold assets were blocked by CSP/optimizer, generating 400/500 and broken media | Exact host CSP/Next allowlist; bypass optimizer for SVG/timeout-prone legacy hosts; branded fallback | Full listing/PDP diagnostics and failure-state test pass |
| HYD-001 | Medium | Dynamic categories | Newly created category rendered slug fallback on server and queried name during hydration | Pass server-resolved category as initial listing data and hold a deterministic server/client shell until hydration | Fresh category CRUD-to-storefront flow passed 3 complete repetitions (9/9 tests) without React error |
| PERF-001 | Medium | Layout stability | The footer could paint inside the initial viewport while streamed/client data was pending, then move out when main content arrived (homepage CLS reached .2422) | Reserve a full viewport for the shared main page shell and retain detailed shift attribution in the performance gate | 15/15 repeated performance checks; final home/shop/PDP CLS 0/.0011/0 |
| SEO-001 | Medium | Metadata | Admin had no title/noindex; storefront canonicals/titles/sitemap were incomplete | Metadata templates, page titles, admin noindex, stock-aware JSON-LD, robots, sitemap | Builds, curl checks, route sweep |
| A11Y-001 | Medium | Semantics/contrast | Homepage lacked a main landmark; muted text and table scrollers failed checks | Landmark, contrast, focus target, keyboard scroller fixes | Axe critical/serious gate 5/5 |
| FAIL-001 | Medium | Failure states | Catalogue outage looked empty; broken image had no consistent recovery | Retryable error state and local branded image fallback | Focused failure suite 3/3 |

## Closed risks

| ID | Concern | Disposition |
|---|---|---|
| RISK-001 | Optional cart/session identity | Closed by identity requirement and service tests |
| RISK-002 | Analytics mock data leaking into production UI | Closed: live dashboard has no mock import; disconnected API renders explicit error/empty state |
| RISK-003 | Provider amount authority and duplicate creation | Closed: server pricing/provider amount plus persisted checkout idempotency |
| RISK-004 | Concurrent payment settlement | Closed by settlement lease/race regression |

## Closed external evidence gates

| ID | Status | Closure evidence |
|---|---|---|
| EXT-PAY-001 | Closed | Mobikwik Test captures `pay_TCTI9fqH0FyFTR` (₹23,202) and `pay_TCTfTED4bKKzuR` (₹1,725), both captured/verified and reconciled across provider/API/DB/storefront/Admin |
| EXT-REF-001 | Closed | Processed provider refunds `rfnd_TCTYkvLAS96EdH` (partial ₹5,000) and `rfnd_TCTgePbxEheptX` (full ₹1,725), including replay, bounds, analytics, webhook, and UI evidence |

## Conditional external prerequisite

| ID | Severity | Prerequisite | Closure action |
|---|---|---|---|
| EXT-WEB-001 | Deployment prerequisite | No public test/staging endpoint or authenticated Razorpay Dashboard session was available, so actual Dashboard delivery was not observed | Sign into the matching merchant, switch to Test Mode, register public HTTPS `/api/v1/payments/webhooks/razorpay`, subscribe to payment/refund events, deliver/retry events, and retain Dashboard delivery evidence |
