# Cruisin Route and Feature Inventory

Final status legend: `P` pass, `B` external blocker, `NA` not published or not
applicable. No route remains `NT`.

## Runtime applications

| Application | Stack | Port | Status |
|---|---|---:|---|
| Storefront | Next.js 15 App Router / React 19 | 3000 | P |
| Admin | Next.js 15 App Router / React 19 | 3001 | P |
| API | Express 5 / TypeScript / Mongoose | 8000 | P |
| MongoDB | MongoDB 7 local Docker | 27017 | P |

## Storefront routes

| Routes | Auth | Primary coverage | Manual | Automated |
|---|---|---|---|---|
| `/`, `/new-featured`, `/men`, `/women`, `/sale`, `/shop`, `/shop/[slug]` | Public | CMS/nav/listing/filter/sort/grid/cards | P | P |
| `/category/[...slug]`, `/collections`, `/collections/[slug]` | Public | Nested category/collection data, media, empty/loading states | P | P |
| `/product/[slug]` | Public; protected wishlist | Gallery, variants, quantity, cart, wishlist, related/recent | P | P |
| `/cart` | Public cart | CRUD, persistence, coupon, totals, checkout handoff | P | P |
| `/checkout` | Customer | Address/shipping/COD/Razorpay/partial availability | P | P |
| `/checkout/success`, `/checkout/failure` | Customer/order owner | Reconciliation display and recovery | P | P; provider success B |
| `/login`, `/register` | Logged-out | Email, Google/OTP affordances, validation, return URL | P | P |
| `/forgot-password`, `/reset-password`, `/verify-email` | Public/token | Validation and state handling | P | P; external message delivery B |
| `/account`, `/account/addresses`, `/account/orders`, `/account/orders/[id]` | Customer/owner | Profile, address CRUD, order list/detail/timeline | P | P |
| `/account/wishlist`, `/account/notifications`, `/account/preferences`, `/account/security` | Customer | Saved items, notifications, preferences, sessions/security | P | P |
| `/about-us`, legal routes, not-found | Public | Content, metadata, recovery | P | P |

## Admin routes

| Routes | Access | Primary coverage | Manual | Automated |
|---|---|---|---|---|
| `/login`, `/` | Admin | Auth, overview KPIs, recent orders | P | P |
| `/analytics` | Admin | Real aggregates, ranges/comparison, charts/tables/CSV/states | P | P |
| `/products`, `/products/new`, `/products/[id]` | Admin/manager API actions | List/search/filter/create/edit/visibility/delete | P | P |
| `/categories`, `/storefront` | Admin/manager API actions | Categories, collections, nav, tags, page/site settings | P | P |
| `/discounts` | Admin/manager | Coupon CRUD and eligibility | P | P |
| `/orders`, `/orders/[id]` | Admin | Detail, legal status, COD/partial collection, refund controls | P | P; provider refund B |
| `/users` | Admin/superadmin actions | Search, detail, role/active controls, minimized commerce summary | P | P |
| `/cms` | Admin | Sections, draft/publish, versions, media | P | P |
| `/catalogues` | Admin | Preview, dry-run, confirm gate, export, history, CSV safety | P | P |

## API groups below `/api/v1`

| Prefix | Access | Status | Evidence |
|---|---|---|---|
| `/auth` | Mixed public/customer/admin | P | Auth/session/origin/role tests and manual sessions |
| `/products`, `/categories`, `/collections` | Public reads; protected writes | P | Route sweep, CRUD reflection, server-authoritative visibility |
| `/navigation`, `/site-settings`, `/page-settings`, `/tags` | Public reads; admin writes | P | Storefront Manager browser suite |
| `/cart`, `/wishlist` | Identified session/customer | P | Identity isolation and stock/visibility tests |
| `/orders` | Customer/owner; admin actions elsewhere | P | Ownership, pricing, status, inventory, idempotency tests |
| `/payments` | Config/customer plus signed raw webhooks | P / B external success | Signature/replay/race tests; real failure UI; provider success blocked |
| `/reviews`, `/notifications` | Mixed public/customer | P | Read/action route inspection and browser states |
| `/newsletter` | Public | NA | Endpoint implemented; homepage module is not currently published |
| `/cms` | Public published reads; admin writes | P | Three-section published contract and admin route sweep |
| `/admin`, `/admin/management`, `/admin/storefront` | Role protected | P | Authorization matrix and full browser control sweep |

## Cross-cutting invariants

- Customer and admin refresh cookies are distinct and origin scoped: P.
- Object ownership and admin roles are enforced: P.
- Checkout price, discount, shipping, COD fee, and advance are server derived: P.
- Checkout creation and payment settlement are idempotent: P.
- Inventory reservation/restore and legal status transitions are guarded: P.
- Webhook raw-body verification, replay guard, and minimized audit payload: P.
- Analytics calculations reconcile to deterministic DB/API/UI fixtures: P.
- CSV formula injection defenses cover all discovered export paths: P.
