# Cruisin storefront, payments, and access-control QA report

Date: 2026-07-11  
Scope: local test environment only. No secrets, test keys, credentials, payment IDs, or customer data are included.

## 1. Executive summary

| Area | Readiness | Evidence-based status |
|---|---:|---|
| Overall | 84% | Access control, protected UX, config consistency, builds, tests, webhook simulation, authenticated Razorpay hosted checkout initiation, and COD/admin-settlement checks pass. |
| Storefront | 88% | Logged-out gates, authenticated product/cart/checkout, and hosted Razorpay Test Mode modal were manually tested. |
| Admin | 70% | Production build/typecheck and admin authorization tests pass; full visual admin matrix is still pending. |
| Mobile | 80% | 390×844 logged-out navigation and prompts manually tested. Authenticated payment flows remain pending. |
| Razorpay sandbox | 75% | Test-mode configuration, server-created Razorpay order, hosted checkout initiation, safe prefill, invalid signature rejection, and valid/duplicate local webhook simulation pass. Hosted payment completion is still pending. |
| Login-required checkout/wishlist | 95% | Storefront gates, backend 401s, DB no-write probe, and order-owner checks pass. |

## 2. Environment used

| Component | Verified local endpoint/status |
|---|---|
| Storefront | `http://localhost:3000` |
| Admin | `http://localhost:3001` |
| Backend | `http://localhost:8000` |
| Database | Docker MongoDB 7, healthy on local port 27017 |
| Razorpay mode | Test mode confirmed without exposing values |
| Browser viewports | Desktop; mobile 390×844 |

## 3. Fixes made

- Removed active guest wishlist persistence and guest order-detail/tracking access.
- Made checkout, COD, partial creation, Razorpay creation/verification, My Orders, and order details authenticated backend flows.
- Kept protected controls visible to logged-out customers and added Cruisin sign-in/create-account prompts.
- Restricted customer order reads to the owning user; moved staff order reads/actions to `/admin/orders...`.
- Guarded checkout success against URL-supplied order disclosure; it fetches the authenticated owner’s order first.
- Added a visible not-authorised state for a customer denied another customer’s order.
- Added safe public payment configuration and made the selector honour COD maximum and partial-payment minimum values.
- Normalized Razorpay contact prefill and limits its safe fallback to test mode.
- Added a local ignored webhook secret solely for local signature simulation.
- Fixed authenticated cart ownership: bearer-authenticated cart requests now use the signed-in user rather than creating a guest-session cart that checkout cannot see.
- Made order-confirmation email delivery non-blocking after durable order/payment state has been committed.
- Replaced the rejected Test Mode contact fallback with a clean number accepted by the hosted Razorpay form; it remains test-mode-only.
- Fixed the payment-failure recovery UI: the Razorpay modal is explicitly closed on a payment-failed event and the retry control is a valid standalone link.
- Aligned cart and checkout free-shipping logic at the ₹25,000 threshold.

## 4. Principal files changed

- `client/app/(shop)/checkout/page.tsx`
- `client/app/(shop)/checkout/success/page.tsx`
- `client/app/(shop)/checkout/failure/page.tsx`
- `client/app/(shop)/account/orders/[id]/page.tsx`
- `client/components/auth/login-required-modal.tsx`
- `client/components/checkout/payment-gateway.tsx`
- `client/components/checkout/checkout-success.tsx`
- `client/lib/payment-availability.ts`
- `client/lib/razorpay.ts`
- `client/store/wishlistStore.ts`
- `server/src/routes/v1/order.routes.ts`
- `server/src/routes/v1/payment.routes.ts`
- `server/src/routes/v1/admin.routes.ts`
- `server/src/services/order.service.ts`
- `server/src/controllers/payment.controller.ts`
- `server/src/middleware/auth.middleware.ts`
- `server/.env.example`, `client/.env.example`, `.gitignore`

## 5. Backend endpoint protection

| Endpoint | Auth | Current result without auth |
|---|---|---|
| `POST /orders/checkout` | Required | `401 Please sign in to continue.` |
| `POST /orders/cod` | Required | `401 Please sign in to continue.` |
| `POST /orders/partial/create` | Required | `401 Please sign in to continue.` |
| `POST /payments/razorpay/create-order` | Required | `401 Please sign in to continue.` |
| `POST /payments/razorpay/verify` | Required | `401 Please sign in to continue.` |
| `POST /wishlist/:productId` | Required | `401 Please sign in to continue.` |
| `GET /orders/mine` | Required | `401 Please sign in to continue.` |
| `GET /orders/:id` | Required | `401 Please sign in to continue.` |
| `POST /payments/webhooks/razorpay` | No user auth | Invalid signature: 401; locally signed event: accepted once; duplicate: ignored. |
| `/admin/orders...` payment/refund actions | Admin required | Customer JWT regression tests: 403. |

Customer ownership is also covered by service tests: another customer and a staff token both receive 403 from the customer order endpoint.

## 6. Storefront logged-out results

| Check | Result |
|---|---|
| Product browsing | Available |
| Direct checkout | Desktop browser showed the required private-checkout screen and exact sign-in/create-account/continue-shopping content. |
| Header wishlist | Remained visible and opened the required wishlist sign-in prompt. |
| Mobile menu | At 390×844 Cart, Wishlist, Orders, Sign in, and Create account remained visible. |
| Mobile Orders | Opened the private-order sign-in prompt. |
| Order details | Account guard redirects guests; API returns 401. |
| No unauthorized data writes | Before/after DB counts stayed unchanged for orders (189) and wishlists (2) across live unauthenticated create probes. |

## 7. Storefront logged-in results

| Flow | Status |
|---|---|
| Header account navigation | Observed in browser before logout: Account, Orders, Wishlist, Preferences, Sign out. |
| Wishlist state | Implemented against backend account wishlist; regression is source/unit covered. A fresh authenticated browser add/remove/reload check is pending. |
| Online checkout | Browser flow authenticated, selected a product/size, added it to the user cart, reached checkout, and opened the hosted Razorpay Test Mode form for a server-priced, user-bound order. Payment completion is still pending. |
| Wishlist | Isolated service tests verify a user-bound wishlist is created and toggled for that user. A fresh authenticated browser add/remove/reload check is pending. |
| COD/partial | Authenticated COD creation was exercised twice; a fresh COD order returned `201` with `placed` / `cod_pending`. Partial remains disabled in the local configuration. |
| Profile/My Orders/order detail | Protected routes, owner-only backend access, and not-authorised UI state pass; full logged-in visual matrix pending. |

## 8. Razorpay online payment results

- Contact prefill removes punctuation/country prefix and accepts valid Indian 10-digit values; the Test Mode-only fallback is unit tested and was accepted by the hosted Razorpay form.
- A Razorpay Test Mode order was created through the authenticated checkout API and the browser opened the hosted payment modal.
- One Test Mode card attempt reached Razorpay and returned the storefront to its failure state. A Test Mode netbanking attempt remained in Razorpay's processing state during the QA window. Neither attempt was recorded as a captured payment by the application.
- The payment-failure handler now closes the Razorpay modal before routing, and the retry UI no longer nests a link in a button. The changed recovery path is build/typecheck covered; a fresh post-fix failure interaction is still pending.
- Invalid signature and owner checks remain covered by API/service tests and local webhook simulation.

## 9. COD results

- Guest COD creation is proven blocked by live API probe and route test.
- Authenticated COD order creation returned `201` with `placed` / `cod_pending` and reserved stock.
- An earlier authenticated COD order was deliberately settled using the admin-only endpoint; it became `paid` with amount due `0`, then the temporary test user's role was restored to customer.

## 10. Partial payment results

- Partial payment is disabled in the present local configuration.
- The payment selector disables it with “Advance payment is currently unavailable.”
- It also disables partial below the public configured minimum; unit tests cover this.
- Enabling and completing a test advance payment remains pending by design.

## 11. Refund results

- Refund route is admin-only and customer JWT attempts are regression tested as 403.
- Service rejects non-Razorpay/non-captured orders and amounts above paid balance.
- Partial/full Razorpay test refunds remain pending until a paid test order is deliberately created.

## 12. Webhook results

- Invalid signature: live local probe returned 401.
- Valid signature without user authentication: locally simulated `payment.captured` event returned accepted.
- Duplicate event ID: second delivery returned “Duplicate Razorpay webhook ignored.”
- The isolated event record was removed after the test.
- A public Razorpay dashboard/tunnel test is pending; a production webhook URL is not configured locally.

## 13. Admin desktop results

- Admin app production build/typecheck pass.
- Admin routes require both auth and admin role; order collection and COD/partial/refund actions reject a customer JWT with 403.
- The local admin browser session redirected to the normal login page; no credentials were entered or bypassed. Full dashboard/order-list/detail visual verification requires an authenticated admin session.

## 14. Admin mobile results

- Not yet manually completed. Build/typecheck cover compilation only, not responsive layout or action visibility.

## 15. Database verification

| Check | Result |
|---|---|
| Mongo connection | Healthy |
| Unauthenticated create attempts | Orders/wishlists counts unchanged before and after probes. |
| Valid webhook idempotency | Event persisted once for simulation, duplicate was ignored, then test fixture removed. |
| Razorpay order record | Pending online order with provider order present; no payment captured. |
| COD records | One fresh reserved `cod_pending` order and one admin-settled paid order with zero amount due were verified. |

## 16. Security test results

- Storefront/admin source audit found no `RAZORPAY_KEY_SECRET` reference.
- `.env` files are ignored; environment examples are the only tracked env artifacts.
- `razorpay_test_api_keys_*.csv` is ignored to protect a copied key export.
- Payment config endpoint returns only mode, availability, and limits; no secret.
- Legacy guest orders remain admin-readable but customer-inaccessible.

## 17. Console/network issues

- The local storefront initially raised a stale Next.js chunk error; restarting its dev server cleared that error.
- Post-restart browser testing successfully completed login, product selection, cart, checkout, and Razorpay Test Mode modal interaction. The Razorpay accessibility snapshot is unusually verbose, but it did not block these interactions.
- Earlier parallel typecheck/build collision was resolved by rerunning typecheck after the build; it was a transient `.next` generated-file race, not a source failure.

## 18. Automated check results

| Check | Result |
|---|---|
| Server tests | 11 files, 42 tests passed |
| Client tests | 3 files, 7 tests passed |
| Server typecheck | Passed |
| Client typecheck | Passed after production build |
| Admin typecheck | Passed |
| Client production build | Passed |
| Diff whitespace check | Passed |

New coverage includes authenticated server-priced checkout, user-bound wishlist creation/toggle, order-list auth, all customer attempts against admin collection/refund actions, Razorpay contact normalization, payment availability limits, ownership denial, and unauthenticated checkout/payment endpoints.

## 19. Remaining blockers

1. A hosted Razorpay **test** payment must still be completed. The currently available Test Mode card attempt declined and the netbanking attempt remained processing; this is required for online success/duplicate/refresh and refund verification.
2. The paid Razorpay order is required for a real provider refund lifecycle and matching database/webhook state.
3. Partial payment is intentionally disabled; it must be enabled locally if its full lifecycle is required.
4. Public-tunnel/Razorpay-dashboard webhook validation is not configured.
5. Full authenticated storefront and admin desktop/mobile visual matrix remains incomplete; the current local admin browser has no signed-in session.

## 20. Go-live checklist

- Replace test configuration with live keys only in deployment secrets.
- Configure and verify the live webhook and production domain/CORS origins.
- Confirm enabled Razorpay payment methods, COD limits/fee, partial-payment rules, and refund policy.
- Run one small authorised live transaction and reconcile the first orders.
- Back up the database; monitor payment/webhook logs after launch.
- Remove the local test-only contact fallback from production behavior (it is already test-mode gated).
- Reconfirm production has no guest checkout, guest wishlist persistence, or guest order access while visible protected controls still show the premium login/signup prompt.

## Final acceptance status

All login-required access-control requirements, visible protected-action UX, backend 401/403 guards, safe config behavior, authenticated Razorpay order creation, COD creation, and admin COD settlement are satisfied by current evidence. Full final acceptance is **not yet achieved** because a hosted Razorpay payment/refund lifecycle and complete authenticated storefront/admin manual matrix remain blocked or unexecuted.
