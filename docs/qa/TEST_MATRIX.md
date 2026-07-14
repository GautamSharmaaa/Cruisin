# Cruisin Production Test Matrix

Final audit status, 2026-07-12 (Asia/Kolkata). `P` means pass and `NA` means not
applicable to the published configuration. There are no `B` or `NT` rows; the
public Dashboard webhook prerequisite is tracked separately as `EXT-WEB-001`.

## Environment and architecture

| ID | Test | Status | Evidence |
|---|---|---|---|
| ENV-001 | Repository scripts, ports, working directories | P | Production artifacts served on 3000/3001/8000; MongoDB local on 27017 |
| ENV-002 | Local/test database only | P | Sanitized URI `mongodb://localhost:27017/cruisin`; Docker container healthy |
| ENV-003 | Razorpay Test Mode only | P | `PAYMENT_MODE=test`; test-key prefix verified without printing credentials |
| ENV-004 | Required variables and git hygiene | P | Runtime schema loaded; `.env` files ignored/untracked; tracked-secret scan clean |
| ENV-005 | Health/readiness/shutdown | P | `/health` liveness; `/ready` dependency-aware 200/503; SIGINT graceful shutdown logged |

## Storefront journeys

| ID | Journey/control family | Desktop | Tablet | Mobile | API/DB | Status | Evidence |
|---|---|---|---|---|---|---|---|
| SF-001 | Homepage/header/menu/footer | P | P | P | P | P | In-app browser plus responsive Playwright 360–1024 |
| SF-002 | Search/suggestions/no-results | P | P | P | P | P | Manual overlay/result/no-result checks |
| SF-003 | Listing/filter/sort/grid/load/cards | P | P | P | P | P | Manual and Chromium suite; grid persistence and sorting asserted |
| SF-004 | PDP/gallery/variant/cart/wishlist/related | P | P | P | P | P | Manual PDP and cross-browser PDP/cart contract |
| SF-005 | Cart CRUD/persistence/coupon/server totals | P | P | P | P | P | CMSHOME10, server-cart sync, unavailable-item removal |
| SF-006 | Logged-out protected actions prompt auth | P | P | P | P | P | Wishlist/cart/checkout protected-action sweep |
| SF-007 | Login/register/refresh/logout/return URL | P | P | P | P | P | Manual customer flow; origin/rotation/logout API regression |
| SF-008 | Account/profile/address/order/wishlist/security | P | P | P | P | P | Address create/default/delete; order history/detail; route sweep |
| SF-009 | Checkout address/shipping/payment recovery | P | P | P | P | P | COD, Razorpay failure/dismissal/retry, duplicate-order reuse |
| SF-010 | Legal/404/loading/empty/offline/broken media | P | P | P | P | P | Branded 404, retryable API outage, local image fallback |

## Payments and order integrity

| ID | Flow | UI | API | DB | Admin | Status | Evidence |
|---|---|---|---|---|---|---|---|
| PAY-001 | COD create, reservation, collection, balances | P | P | P | P | P | `CR-MRGFJI0N-GU4U8`: ₹41,654 due, then paid/due=0; storefront/admin agree |
| PAY-002 | Razorpay Test order/modal/success/reconciliation | P | P | P | P | P | Two genuine Mobikwik Test captures: `pay_TCTI9fqH0FyFTR` for ₹23,202 and `pay_TCTfTED4bKKzuR` for ₹1,725; server signatures verified, one attempt/stock decrement each, cart cleared, storefront/Admin reconciled |
| PAY-003 | Razorpay cancel/failure/retry/duplicate/tamper | P | P | P | P | P | Unsupported test card reached failure route; cart retained; repeated retry kept exactly one local/provider order; tampered signature rejected |
| PAY-004 | Signed webhooks/replay/concurrent verification | NA | P | P | P | P | Actual provider entities were replayed locally with valid HMACs: valid accepted, invalid 401, duplicate event `processed:false`, unknown order safe; concurrent real verify/captured replay left refunded balances, one attempt, timeline, and stock unchanged. Dashboard delivery remains a deployment prerequisite |
| PAY-005 | Partial payment availability/lifecycle | P | P | P | P | P | Disabled consistently in current config; service tests cover captured advance and remaining collection |
| PAY-006 | Refund bounds/provider/idempotency/visibility | P | P | P | P | P | Provider partial `rfnd_TCTYkvLAS96EdH` ₹5,000 processed; fresh-capture full `rfnd_TCTgePbxEheptX` ₹1,725 processed. Same-key replay produced no second refund/timeline; zero/negative/over-balance/COD/customer requests rejected; both UIs and analytics reconciled |
| ORD-001 | Server-authoritative pricing/coupon/shipping | P | P | P | P | P | Checkout service pricing tests and real COD totals |
| ORD-002 | Ownership and role authorization | P | P | P | P | P | Other-customer order 403; customer admin/refund 403; owner/admin allowed |
| ORD-003 | Inventory decrement/restore/idempotent order | P | P | P | P | P | Settlement race/rollback tests; browser retry DB count remained one |

## Admin journeys

| ID | Area/control family | Desktop | Tablet | Mobile | API/DB | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AD-001 | Login/session/unauthorized/direct route/logout | P | P | P | P | P | Manual plus cross-browser Admin login |
| AD-002 | Overview KPIs/recent orders/states | P | P | P | P | P | Full route/control sweep |
| AD-003 | Product search/filter/create/edit/visibility/delete | P | P | P | P | P | Browser-created merchandising record, storefront reflection, cleanup |
| AD-004 | Categories/collections/navigation/settings | P | P | P | P | P | CRUD/visibility/button suite and manual sweep |
| AD-005 | Orders/status/COD/partial/refund controls | P | P | P | P | P | Order detail, legal transition graph, collection actions, refund bounds |
| AD-006 | Users/search/detail/permissions/minimization | P | P | P | P | P | Drawer responsive fix; role authorization/API projections |
| AD-007 | Discounts/coupons/storefront reflection | P | P | P | P | P | CRUD coupon applied in storefront cart; customer usage limit enforced |
| AD-008 | CMS draft/publish/preview/version controls | P | P | P | P | P | Route/control sweep; published three-section homepage contract verified |
| AD-009 | Catalogue preview/dry-run/export/history/security | P | P | P | P | P | Real 235-row fixture, 44 validation groups, CSV neutralization tests |
| AD-010 | Analytics accuracy/ranges/export/states/a11y | P | P | P | P | P | Deterministic 60-day batch reconciled DB/API/UI; responsive + axe pass |

## Quality gates

| ID | Check | Status | Evidence |
|---|---|---|---|
| QG-001 | Unit/service tests | P | 72 server + 7 client + 10 admin = 89 passing |
| QG-002 | Typecheck and lint scripts | P | All three workspaces pass |
| QG-003 | Playwright projects | P | Final full run: 52 passed, 3 NA skips, 55 total; payment-scoped Admin Chromium rerun 3/3 after final production-artifact restart |
| QG-004 | Production builds | P | Storefront, Admin, and API builds pass from clean production artifacts |
| QG-005 | Dependency audit | P | Production and complete npm audit: 0 vulnerabilities |
| QG-006 | Accessibility | P | Axe serious/critical gate 5/5 plus keyboard/focus/manual responsive checks |
| QG-007 | Performance | P | Home LCP 136ms/CLS 0; shop LCP 220ms/CLS .0011; PDP LCP 128ms/CLS 0 in final production-artifact run |
| QG-008 | SEO/metadata/robots/sitemap | P | Canonicals/titles/JSON-LD, admin noindex, robots and dynamic 83-URL sitemap |
| QG-009 | Security/configuration | P | Cookies/origins/roles/CSP/CSV/upload/env/dependency checks passed |
| QG-010 | External live-commerce proof | P | Genuine Razorpay Test captures plus processed partial/full refunds are reconciled. Actual Dashboard-to-public-HTTPS webhook delivery is the sole external deployment prerequisite |
