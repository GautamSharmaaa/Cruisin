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

## 21. Railway deployed Test Mode check — 2026-07-19

| Check | Result |
|---|---|
| Railway services | Storefront, API, and Admin were online on their Railway public domains. |
| Public payment configuration | `200`; payment mode is Test Mode, COD is enabled, and partial payment is explicitly disabled. The returned object contained no key or secret fields. |
| Protected Razorpay/order APIs | Unauthenticated checkout, COD, partial, Razorpay create-order, and Razorpay verify calls each returned `401 Please sign in to continue.` |
| Webhook signature guard | A deliberately invalid Razorpay signature returned `401 Invalid Razorpay signature`. |
| Hosted checkout readiness | The deployed sign-in/registration UI rendered correctly. A disposable QA account was created, then correctly denied sign-in until email verification. |
| Blocking test prerequisite | The disposable `.test` QA mailbox cannot receive the verification link. The account therefore cannot sign in, so an authenticated Razorpay Test Mode order, capture, refund, and valid signed webhook cannot be completed. The UI's optional-provider notice is not treated as evidence that email delivery failed. |

The Railway deployment is safely running in **Razorpay Test Mode**. Do not enable Live Mode or use a real payment method until a verified QA account is available, an authenticated Test Mode payment is captured, the order reaches `paid`, and a provider refund plus a valid signed webhook have been verified.

### Follow-up — verified QA account

The verified QA customer was able to sign in successfully on the Railway storefront. The authenticated shop page and the public products API both reported **zero products**. This prevents adding a cart item and therefore prevents checkout creation, Razorpay capture, order verification, or refund testing. No public test product was created because that would modify the production catalogue outside the approved payment-test scope.

### Follow-up — authorized Railway QA product and hosted-checkout launch

After explicit authorization, the promoted superadmin created one published, visible, low-price **RAZORPAY TEST MODE QA TEE** product with one enabled variant and five units of stock. Manual desktop testing then passed:

- superadmin login and product creation;
- customer login, product detail, variant selection, cart addition, and checkout;
- server-priced checkout summary (₹10 item, ₹900 shipping, ₹2 tax, ₹912 total) with the online Razorpay method selected.

The checkout could not open the hosted Razorpay modal. The deployed storefront displayed **“Online payments are not configured for this storefront.”** while the API payment configuration still reported Test Mode. This proves that the API Test Mode variables are present, but the storefront build is missing `NEXT_PUBLIC_RAZORPAY_KEY_ID` (or was not redeployed after it was set). Configure that variable on the **cruisin-storefront** Railway service with the Razorpay **Test** key ID only, redeploy the storefront, and retain all secrets exclusively in the API service. Only then can payment capture, signature verification, valid webhook delivery, and the admin refund lifecycle be manually completed.

### Follow-up — storefront key deployed and manual Razorpay Test Mode attempt

After `NEXT_PUBLIC_RAZORPAY_KEY_ID` was added to the storefront service and the storefront was redeployed, the hosted Razorpay Test Mode iframe opened successfully. Manual verification covered the published QA product, authenticated customer cart, server-priced checkout, Razorpay card selection, an official Razorpay Indian Test Mode Visa card, and the explicit **do not save card** path.

Razorpay then remained indefinitely on its hosted **“Sending OTP”** screen. There were no storefront console errors. The admin Orders screen confirmed that both attempts are correctly durable, user-bound online orders with `pending` payment status, `paid ₹0`, and the complete amount due. Therefore the storefront/API integration did not falsely mark either payment as successful. No refund was attempted because Razorpay never captured a payment.

The remaining external requirement is to resolve the Razorpay Test Mode OTP simulator/session and complete its mock-bank success step. Once Razorpay emits a successful payment response, the existing backend signature verification, order-state transition, webhook, and admin refund checks can be completed.

### Follow-up — deployed storefront login matrix — 2026-07-20

| Storefront authentication path | Result |
|---|---|
| Verified email/password | Pass — the verified QA customer had already completed a successful deployed storefront sign-in during the authenticated cart and checkout test. |
| Invalid email/password | Pass — a synthetic non-existent account was rejected with the visible `Invalid credentials` message and remained on the sign-in page. |
| Unverified email/password | Pass — the disposable QA account was correctly rejected with `Verify your email before signing in`; no session was created. |
| Google | Not enabled — the deployed UI displays a disabled `Continue with Google` control. |
| WhatsApp OTP | Entry UI renders (country code, number, and send control), but delivery was not attempted because the page shows `Provider is not configured yet` and no real recipient was authorized for an outbound OTP. |
| Create-account route | Renders correctly with name, email, password, confirmation, and create-account controls. No additional production account was created for this UI-only check. |

No credentials, OTPs, keys, or secrets were displayed or recorded during this matrix. The disabled Google and unconfigured-provider states are product configuration gaps rather than authentication bypasses.

## 22. Configurable delivery pricing — local implementation and QA — 2026-07-20

The admin dashboard now has a first-class **Delivery** section. An authorized operator can configure:

- the standard delivery charge;
- an optional original standard-delivery price to display struck out;
- the express delivery charge;
- the cart-value threshold for free standard delivery, with `0` disabling the threshold.

The storefront consumes the published settings in the cart drawer, full cart, checkout delivery selector, order summary, and server-authoritative order calculation. A free-delivery promotion can therefore display, for example, struck-out `₹99` and `Free` without requiring a coupon. Express delivery remains chargeable unless explicitly priced at zero, and coupon-based free delivery continues to work independently.

### Configurations exercised

| Configuration | Verified result |
|---|---|
| Standard `₹99`, compare-at `₹99`, express `₹199`, free above `₹1,000` | A ₹10 cart showed ₹990 remaining and charged ₹99; a qualifying cart showed struck-out ₹99 and `Free`. |
| Standard `₹0`, compare-at `₹99`, express `₹199`, threshold disabled | Cart and checkout showed struck-out ₹99 and `Free` with the limited-time delivery promotion message and no coupon. |
| Express selected during the automatic standard-delivery promotion | Express charged ₹199 and updated the final total correctly. |
| Threshold set to `0` | Threshold messaging and progress were disabled; `0` was not interpreted as every cart qualifying. |

### Manual order and admin reconciliation

- Authenticated customer checkout completed with the ₹10 QA product and automatic free standard delivery.
- COD order `CR-MRT3NRNL-MNOL0` (`6a5dfc900c1bc48b2739722b`) was created for ₹12.
- Admin order details reconciled to subtotal ₹10, tax ₹2, shipping ₹0, COD fee ₹0, discount ₹0, total ₹12, paid ₹0, and due ₹12.
- The QA order was then cancelled with a QA note, and the reserved stock was restored.
- Delivery settings were restored after testing to standard ₹900, no compare-at value, express ₹1,800, and free standard delivery above ₹25,000.
- Browser console warning and error checks were empty during the delivery, cart, checkout, order-confirmation, and admin-verification pass.

### Automated verification

| Check | Result |
|---|---|
| Full workspace unit/integration tests | Passed: server 16 files / 93 tests, client 7 files / 25 tests, admin 2 files / 13 tests. |
| Delivery pricing unit tests | Passed: client 9 focused cases plus server threshold, coupon, zero-threshold, express, and server-authoritative order coverage. |
| Focused delivery Playwright flow | Passed: settings save/publication, threshold preview, automatic promotion, disabled threshold, restoration, and 390px layout. |
| Storefront-manager Playwright regression | Passed: 9/9, including full CRUD/visibility behavior and widths 1440, 1280, 1024, 768, 430, 390, and 360px. |
| Typecheck | Passed for client, admin, and server. |
| Production build | Passed for client, admin, and server; the admin route manifest includes `/delivery`. |
| Diff whitespace check | Passed. |

The implementation and the test order in this section were exercised locally against the configured test data. These delivery code changes have **not** been committed, pushed, or redeployed to Railway in this task.

## 23. Storefront delivery follow-up fixes — 2026-07-22

- Checkout now renders an explicit session-checking state until authentication restoration completes. Address, shipping, payment, and order controls are not mounted during this interval, eliminating the brief protected-checkout content flash for guests.
- The first visible cart, cart-drawer, and checkout-summary product image is now prioritized. The previously observed Next.js LCP image warning no longer appears during the cart verification flow.
- A Playwright regression deliberately holds the refresh request open and confirms that protected checkout controls remain absent, then confirms the guest sign-in screen after the refresh is rejected.
- Verification passed: 2/2 focused delivery Playwright tests, 131/131 workspace unit/integration tests, client typecheck, client production build, live cart console check with zero warnings/errors, and diff whitespace validation.

## 24. Live Railway Razorpay revalidation — 2026-07-22

The production Railway API remains healthy and explicitly reports Razorpay **Test Mode**. Its public payment configuration exposes only feature flags and limits: COD is enabled, partial payment is disabled, and no key or secret field is present in the response.

Security revalidation passed:

- unauthenticated checkout, COD, partial-payment, Razorpay create-order, and Razorpay verify requests each returned `401`;
- an invalidly signed Razorpay webhook returned `401 Invalid Razorpay signature`;
- the storefront Railway service contains `NEXT_PUBLIC_RAZORPAY_KEY_ID`, while the backend secret remains confined to the API service.

The live admin session reconciles three existing QA orders. Two online Razorpay orders remain `pending`, with `paid ₹0`, the full amount due, a Razorpay order ID, and no Razorpay payment ID. The admin correctly offers no refund operation for either uncaptured order. The previous COD delivery QA order remains cancelled. No live order has been falsely marked paid and no refund has been forced without a captured payment.

The current blocker to a fresh hosted-checkout success/failure/refund pass is storefront authentication: the Railway storefront session is signed out and no password was supplied to QA. The page has been handed off for the account owner to sign in. Google cannot be used as a fallback because `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is absent from the storefront Railway service, even though `GOOGLE_CLIENT_ID` is present on the API. The deployed UI therefore correctly disables Google and displays `Provider is not configured yet`.

After storefront sign-in, the remaining live matrix is: create one new low-value online order, exercise hosted Test Mode dismissal/failure/success where supported by Razorpay, reconcile it in admin, verify payment signature/webhook state, refund only a captured Test Mode payment, verify refund idempotency, and cancel/clean up any unpaid QA orders.

### Authenticated hosted-payment completion

The account owner signed in and the authenticated Razorpay lifecycle completed for order `CR-MRV0XBEX-5AMTZ`:

- one `RAZORPAY TEST MODE QA TEE` at ₹10, ₹900 standard delivery, ₹2 tax, and ₹912 total;
- Razorpay's hosted checkout visibly displayed **Test Mode**;
- the current official Razorpay Indian Test Mode Visa was accepted with card saving left disabled;
- the storefront returned `Order Confirmed` and `Payment confirmed`;
- the storefront order record showed `confirmed · paid`, paid ₹912, refunded ₹0, due ₹0, and `Payment signature verified`;
- the admin order record matched the Razorpay order and payment IDs, line item, shipping address, subtotal, tax, shipping, total, paid amount, and due amount;
- Razorpay's backend API independently reported the payment as `captured`, card method, amount 91,200 paise, and captured `true`.

The two older abandoned online QA orders and the previous COD delivery QA order are all cancelled. The admin ledger therefore ends with four QA orders: one confirmed paid order and three cancelled orders, with no pending orders.

### Refund and webhook findings

| Check | Result |
|---|---|
| Full ₹912 refund from admin | Failed with Razorpay `400 invalid request sent`; order correctly remained paid and no refund was recorded. |
| ₹1 partial refund from admin | Passed; Razorpay created the refund, and its backend API independently reported the refund as `processed` for 100 paise. |
| Exact replay of the ₹1 refund | Passed idempotency; no duplicate refund or timeline entry was created. |
| Remaining ₹911 full-balance refund | Failed with the same `invalid request sent`, isolating the failure to the deployed full-balance request shape. |
| Refund webhook reconciliation | Failed; Railway recorded no incoming Razorpay webhook request, so admin still shows the processed provider refund as `pending` and paid revenue remains unreduced. |

The Razorpay dashboard must point its Test Mode webhook to `https://cruisin-api-production.up.railway.app/api/v1/payments/webhooks/razorpay` and subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`. Setting `RAZORPAY_WEBHOOK_SECRET` on Railway alone does not create or subscribe the provider webhook.

The full-refund defect has been fixed locally by always sending the exact integer-paise `amount` to Razorpay, including when refunding the complete remaining balance. A second local guard now includes provider `pending` refunds in the reserved refundable amount so concurrent requests cannot over-allocate that balance. Verification passed: 16 server test files / 94 tests, including the new full-refund and pending-refund cases, plus server typecheck. These fixes are not deployed because the current worktree also contains the previously requested uncommitted delivery feature.

One additional deployed-session issue was observed: after the successful order-detail flow, a full navigation to `/shop` returned the storefront to `Sign in`. This prevented a second fresh failed-card attempt in the same authenticated session and should be treated as an authentication-persistence defect, not a Razorpay payment failure.

## 25. Customer cancellation, detailed orders, and admin refund operations — 2026-07-22

The local implementation now provides a complete pre-shipment cancellation workflow for authenticated customers. Eligible `pending`, `placed`, `confirmed`, and `processing` orders expose **Cancel order**; shipped, delivered, returned, and already-cancelled orders do not. The customer must choose a common reason or **Other reason**. Other requires a 10–500 character explanation, and the destructive confirmation remains disabled for five seconds after the dialog opens.

Cancellation is enforced by the backend, not only by the UI. The API validates ownership, allowed status, reason, and compulsory Other details; records who cancelled, the structured reason, details, timestamps, refund state, and timeline entry; and restores reserved inventory. The state change is atomic/idempotent so concurrent duplicate cancellation requests cannot restore stock twice. A Razorpay capture that arrives after cancellation no longer re-confirms the order: the payment is recorded against the still-cancelled order and the cancellation is marked `refund required` for admin review.

The storefront order list and detail page now show product photography, product and variant names, quantity, order/date/status, delivery destination and full address, shipping method and tracking, payment/refund status, itemized bill components, total/paid/refunded/due amounts, refund history, cancellation reason/details, and the full order timeline. Desktop and 390px layouts were exercised without horizontal overflow.

The admin order list, drawer, and detail page now expose the cancellation reason, customer explanation, requester, time, and refund status. Search includes cancellation data and an actionable refund counter highlights required or failed refunds. Admins can issue only the remaining unreserved captured Razorpay amount, must confirm the financial action, and always attach an audit reason (the customer cancellation reason is used when appropriate). **Sync refund status** reads the current provider refund through the backend; it does not permit a manual/fake financial status override. Order status choices are restricted to valid transitions, and admin cancellation requires a note.

### Verification

| Check | Result |
|---|---|
| Full workspace tests | Passed: server 17 files / 107 tests, client 8 files / 28 tests, admin 2 files / 13 tests (148 total). |
| Cancellation/payment edge coverage | Passed: ownership, post-shipment rejection, Other validation, anonymous route rejection, duplicate cancellation idempotency, late payment capture, refund bounds, refund synchronization, and admin financial-route authorization. |
| Focused production-build Playwright flows | Passed: storefront detailed order list, compulsory Other explanation, five-second delay, cancellation payload, cancelled/refund-required UI, detailed bill/address/timeline, and 390px no-overflow; admin cancellation visibility/search, valid status choices, product photo, bounded full refund with audit reason/idempotency key, and backend refund synchronization to processed/refunded. |
| Typecheck | Passed for client, admin, and server. |
| Production build | Passed for client, admin, and server. |
| Diff whitespace check | Passed. |

These cancellation and detailed-order changes are local. They have **not** been committed, pushed, or deployed to Railway. The deployed website will not show them until the combined dirty worktree is reviewed and explicitly authorized for deployment.

## 26. Local manual browser cancellation and refund verification — 2026-07-22

The customer and admin flows were re-run manually in the local in-app browser against the real local API and database. A disposable ₹12 COD order, `CR-MRV2DE0U-OXNOF` (`6a5fcc8055dfe4b8fca27cf7`), was created through checkout and cancelled from its storefront detail page.

- The order-confirmation page linked to the correct order detail.
- Product photo/name/variant/SKU, delivery address, bill breakdown, payment state, and timeline rendered on desktop and at 390 × 844.
- The cancellation dialog showed four common reasons plus **Other reason**. Other exposed a compulsory text field; eight characters remained invalid, a valid explanation enabled confirmation only after the five-second guard, and the submitted reason appeared immediately in the customer timeline and cancellation/refund panel.
- The admin list and drawer showed the same reason and explanation, requester, cancellation time, ₹0 due, and `Refund not required`. The full admin detail showed the line-item photo, address, totals, and immutable cancelled status.
- The existing paid Razorpay Test Mode order correctly rejected an over-limit refund amount, enabled an in-range amount, and synchronized its existing ₹1 provider refund through the backend. Razorpay moved it from `pending` to `processed`; the admin order reconciled to `partially_refunded` with ₹1 refunded and a new audit timeline entry. No additional refund was created.
- Browser warning/error logs were empty for both local applications.

Manual QA exposed and fixed two legacy/terminal-state defects: old cancelled orders could still display a non-zero amount due, and a cancelled COD order still exposed **Mark COD paid**. Cancelled read models now normalize due to ₹0, storefront/admin displays defensively enforce the same rule, cancelled paid orders are excluded from the admin paid/revenue counters, collection controls are hidden after cancellation, and the backend rejects direct collection attempts for cancelled orders.

Final verification passed: 109 server tests, 28 storefront tests, 13 admin tests (150 total), all workspace typechecks, two focused cancellation Playwright flows, and the final live local browser recheck. These fixes remain local and are not committed or deployed.

## 27. Full and partial Razorpay cancellation refunds — local Test Mode — 2026-07-22

Two new low-value orders were completed through the real hosted Razorpay **Test Mode** checkout, cancelled from the customer storefront, refunded from the admin dashboard, synchronized from Razorpay, and reconciled back to the customer order detail. No live funds or live credentials were used.

| Scenario | Verified result |
|---|---|
| Full-payment refund | Order `CR-MRV39MZ5-8NUZS` (`6a5fd261eb24a47b415bcb1e`) captured ₹12. Customer cancellation recorded `Changed my mind`; admin could refund exactly ₹12 but no more. Razorpay refund `rfnd_TGHVYT20P1IXsC` synchronized from pending to processed. Customer and admin both ended at paid ₹12, refunded ₹12, due ₹0, payment `Refunded`. |
| Partial-payment refund | Partial payment was enabled locally at 25% for the test. Order `CR-MRV3INHZ-NFBK0` (`6a5fd4051423668567666300`) captured a ₹3 advance against a ₹12 total, leaving ₹9 due before cancellation. Customer cancellation recorded `Wrong size/item`; cancellation normalized due to ₹0. Admin rejected ₹12 as over-limit and allowed exactly ₹3. Razorpay refund `rfnd_TGHcWN4x3wKPp5` synchronized to processed; both applications ended at refunded ₹3 and due ₹0. |
| Hosted-checkout dismissal/failure | A card attempt was cancelled while the hosted checkout was waiting for its Test Mode OTP. The failure callback returned to the storefront failure route and did not mark the order paid. |
| Refund safety | Processed and in-flight refunds reserve the refundable balance, completed refunds no longer appear as pending reservations, and neither full nor partial orders can be over-refunded. |
| Customer messaging | Checkout states the exact advance and remaining balance (`Pay ₹3 now (25%); ₹9 is due on delivery`). Once processed, the order page confirms the exact Razorpay refund amount and notes that bank posting can take additional time. |

Automated verification passed 110 server tests, 30 storefront tests, and 13 admin tests (153 total), all workspace typechecks, the diff whitespace check, and the three focused customer/admin cancellation-refund Playwright cases. The broader historical Playwright matrix finished with 43 passed, 3 skipped, and 14 failed; those failures are in pre-existing CMS catalogue assumptions, admin fixture expectations, a known admin loading-state ARIA issue, and the same stale catalogue assumptions across browser engines—not in the payment, cancellation, or refund cases.

The partial-payment setting was changed only in the local process environment for QA. These refund changes remain local and have not been committed, pushed, or deployed to Railway.

## 28. Animated empty-cart Cruisin tote — 2026-07-22

The empty cart no longer uses the plain gold rectangle or oversized `C`. It now renders a code-native, continuously rotating 3D shopping tote shaped to the supplied reference: a broad tapered face, visible side gusset and fold seams, dark top opening, hanging U-shaped straps with attachment tabs, floor shadow, and only the `Cruisin` wordmark. The animation uses no external image asset and respects reduced-motion preferences.

Manual mobile QA at 390 × 844 confirmed the front, side, and rotating states, correct `/cart` composition, readable branding, working **Continue Shopping** link, and no horizontal overflow. The focused Playwright regression passed 1/1 and verifies the two-sided Cruisin wordmark, handles, side panels, running animation, CTA, and mobile overflow guard. Workspace typecheck and diff whitespace validation also passed. This visual change is local and is not yet deployed.

## 29. Reusable revolving tote navigation icons — 2026-07-22

The 3D tote is now a shared display/icon component. Compact, higher-contrast versions replace the static shopping-bag glyph in the main header cart button and the cart control inside the mobile menu. The **Shop** item in the fixed bottom navigation deliberately retains a static bag glyph so only one revolving bag is visible at a time on mobile. Existing accessible labels, 44px tap targets, cart count badges, destinations, and cart-opening behavior are unchanged. The compact version retains the tapered face, U-shaped handles, side depth, shadow, full rotation, and reduced-motion behavior while omitting unreadable micro-sized wordmark text.

Manual browser QA at 390 × 844 verified multiple front/side animation frames, the mobile menu overlay, and the mobile-menu-to-cart-drawer interaction. Focused Playwright verification passed 2/2, all 30 storefront unit tests passed, storefront typecheck passed, and diff whitespace validation passed. These changes remain local and are not deployed.

## 30. Cursive header wordmark — 2026-07-22

The centered storefront header wordmark now uses a dedicated elegant cursive font stack (`Snell Roundhand`, `Apple Chancery`, `Segoe Script`, and compatible fallbacks). The treatment is limited to the main header link so product, page-title, footer, and supporting Cruisin typography remain unchanged. Manual 390 × 844 browser QA confirmed centering, readability, and compatibility with the revolving cart icon. The focused 2/2 Playwright checks, storefront typecheck, and diff whitespace validation passed. This change remains local and is not deployed.

## 31. Sign-in and sign-up brand artwork — 2026-07-22

The supplied metallic Cruisin monogram now fills the complete left authentication panel edge-to-edge, reaching every panel border rather than sitting inside a centered card. It is shown consistently for both **Sign In** and **Create Account**; protected top and bottom gradients keep the brand heading and `Wear Less. Mean More.` readable over the full-bleed artwork. The original 3.6 MB PNG was resized and encoded as a 148 KB WebP storefront asset without materially changing its appearance. The decorative image is hidden below the desktop breakpoint so the mobile form remains compact and accessible.

Manual browser QA covered sign-in, sign-up, desktop 1280 × 900, and mobile 390 × 844 layouts. The dedicated Playwright suite passed 2/2, all 30 storefront unit tests passed, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 32. Google authentication visual integration — 2026-07-22

The official Google Identity Services button remains intact for compliant credential handling, but its surrounding presentation now follows the Cruisin black-and-gold system. A responsive measured container keeps the Google button aligned to the same 400px method width as WhatsApp and email, with a restrained gold border, dark shell, `Secure account access` eyebrow, consistent spacing, and an `Other secure methods` divider. The presentation automatically contracts to the available width on mobile, and the Google text changes between **Continue with Google** and **Sign up with Google** with the selected authentication tab.

Manual browser QA covered both tabs at 1280 × 900 and the 390 × 844 mobile layout. Four focused authentication Playwright checks passed, including method visibility, width alignment, sign-up state, and WhatsApp OTP interaction. All 30 storefront unit tests, storefront typecheck, and diff whitespace validation passed. This change remains local and is not deployed.

## 33. Cruisin favicon — 2026-07-22

The supplied `Cruisin-logo.svg` artwork is now used for the storefront favicon. Because the source is a landscape SVG wrapper around embedded raster artwork, it was fitted without distortion onto a square black canvas and exported as optimized App Router assets: a 512 × 512 browser icon and a 180 × 180 Apple touch icon. Next.js publishes both automatically from the root layout.

Local browser inspection confirmed the generated `rel="icon"` and `rel="apple-touch-icon"` metadata, and both image URLs returned HTTP 200 with `image/png`. The focused Playwright regression passed 1/1, storefront typecheck passed, and diff whitespace validation passed. These assets remain local and are not deployed.

## 34. Sleek mobile menu mark — 2026-07-22

The storefront header menu mark now uses a restrained tapered treatment with three crisp lines measuring 28px, 20px, and 12px. The visible artwork is lighter and more editorial while the accessible 44 × 44px tap target remains unchanged. Its existing motion is preserved: the tapered lines resolve into a balanced close state, with a soft gold hover glow instead of the previous square outline.

Manual browser QA at 390 × 844 confirmed alignment beside the cursive wordmark and revolving bag, successful menu open/close behavior, and clean rendering over the homepage hero. The focused mobile Playwright regression passed 2/2, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 35. Cursive footer wordmark — 2026-07-22

The footer brand title now uses the same `brand-wordmark-script` treatment and `Cruisin` title casing as the centered header wordmark. Supporting copy, footer columns, links, and spacing remain unchanged.

Manual browser QA confirmed the treatment at 1280 × 900 and 390 × 844 with no horizontal overflow. The focused footer Playwright regression passed 2/2, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 36. Animated header tagline — 2026-07-22

The desktop `Wear Less. Mean More.` header tagline now uses a slow 5.4-second light sweep: muted grey rests between narrow gold and white highlights, accompanied by a restrained tracking pulse. The treatment uses text clipping rather than extra visual elements, so the wordmark remains centered and the header layout is unchanged. Users requesting reduced motion receive static muted text with no animation.

Manual browser QA observed the rest and highlight states at 1280 × 900. The focused Playwright regression passed 2/2, covering both the live animation and reduced-motion fallback; storefront typecheck and diff whitespace validation also passed. This change remains local and is not deployed.

## 37. Cursive mobile-menu wordmark — 2026-07-22

The Cruisin title in the mobile menu header now uses the same `brand-wordmark-script` typography and 28px scale as the main navigation identity. The menu tagline, controls, spacing, and navigation hierarchy are unchanged.

Manual browser QA at 390 × 844 confirmed balanced alignment between the close control and revolving bag. The focused mobile-menu Playwright regression passed 1/1, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 38. Admin-controlled listing hero backgrounds — 2026-07-22

The translucent image/video layer behind product-listing headings is now globally controllable from **Admin → Storefront → Settings → Listing hero backgrounds**. The new setting covers page-settings heroes, individual collection heroes, and category image fallbacks without deleting any stored image or video URLs. Disabled media is suppressed while site settings are still loading, preventing the brief hero-image flash that was found on direct collection-page loads.

The control was switched off manually in the local admin dashboard. Manual storefront QA confirmed zero hero-media elements—both immediately and after settling—on `/shop`, `/new-featured`, `/men`, `/women`, `/sale`, `/collections`, `/collections/black-transit`, and `/category/men`. Desktop 1440 × 900 and mobile 390 × 844 visual checks showed the clean grid background with no overflow.

The focused admin/storefront Playwright regression passed 1/1 across all eight routes and proved saved page/collection hero URLs remain available. Client, admin, and server typechecks passed; the server validator suite passed 4/4; and diff whitespace validation passed. The setting is currently off only in the local database. Code changes remain local and are not deployed.

## 39. Unique mobile Shop All control — 2026-07-22

The second fixed mobile-navigation item now uses a purpose-built Shop All catalogue mark instead of a shopping-bag glyph. Its four-tile grid, gold focus tile, outlined frame, and small `ALL` label visually distinguish the complete catalogue from the rotating cart bag in the header. The control keeps the original tap area and `/shop` destination, with an explicit `Shop All` accessible name.

Manual browser QA at 390 × 844 confirmed clear spacing, readable micro-labeling, one rotating bag only, and successful navigation to `/shop`. The focused Playwright regression passed 1/1, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 40. Cruisin editorial catalogue dossiers — 2026-07-22

Generic product-listing headers have been replaced with a shared Cruisin editorial dossier across Shop All, New & Featured, Men, Women, Sale, Collections, individual collections, and category pages. Each route now has its own catalogue code and deterministic folio, oversized editorial title, edition note, indexed-piece count, animated index line, and a coordinated **Refine the edit** toolbar. The composition is code-native and responsive, with no decorative hero image dependency.

Real subtitles configured through admin page settings are still respected. Missing subtitles and the old `Admin-managed Cruisin category page.` seed placeholder now receive customer-facing editorial copy instead. New category seeds use the editorial wording, and the bootstrap seeder includes a targeted migration for records that still exactly match the legacy placeholder; unrelated admin-authored descriptions are never overwritten.

Manual in-app browser QA confirmed the expected title, unique route code, edition note, and absence of legacy admin copy on all eight representative routes. Desktop 1440 × 900 and mobile 390 × 844 visual checks confirmed the dossier and filter controls remain composed without horizontal overflow. The focused Playwright regression passed 2/2 across the full route matrix and mobile category layout; client and server typechecks and diff whitespace validation also passed. These changes remain local and are not deployed.

## 41. Minimal Shop All storefront mark — 2026-07-22

The four-tile framed catalogue badge introduced in section 39 has been superseded by a single minimal storefront outline. The new 20px thin-line mark has no surrounding box, filled tile, or `ALL` micro-label, so it matches the visual weight of Home, Search, Wishlist, and Account while remaining immediately recognizable as the Shop All destination. The accessible `Shop All` name, original tap target, and `/shop` route are unchanged.

Manual 390 × 844 browser QA confirmed exactly one SVG, no visible text, a 20 × 20px icon box, correct navigation destination, balanced alignment, and no console warnings or errors. The focused Playwright regression passed 2/2, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 42. Minimal catalogue header with gold motion line — 2026-07-22

The catalogue dossier introduced in section 40 has been visually simplified. Decorative folio numbers—including the oversized route-generated number—route codes, padded item counts, indexed/visible counters, boxed background, shadow, corner ornaments, and vertical side copy have all been removed. The header now contains only the Cruisin catalogue eyebrow, responsive page title, short edition note, and the retained animated gold running line on the natural grid background.

The new treatment is substantially shorter and quieter while every route remains identifiable through its real title and admin-authored editorial subtitle. Manual browser QA covered New & Featured at 1440 × 900 and 390 × 844; no generated number or legacy admin placeholder is exposed. The focused Playwright matrix passed 2/2 across all eight listing routes and the mobile category layout, storefront typecheck passed, and diff whitespace validation passed. This change remains local and is not deployed.

## 43. Flush mobile authentication layout — 2026-07-22

The excessive blank area between the fixed storefront header and the Sign In/Create Account shell has been removed on mobile and tablet layouts. The auth shell now begins exactly at the 80px header edge, using the existing application offset plus only the 16px compensation required for the taller fixed header; bottom padding remains intact for the fixed mobile navigation. Desktop authentication spacing and the full-bleed brand-artwork composition are unchanged.

Manual browser QA at 390 × 844 confirmed a measured 0px gap for both Sign In and Create Account, correct tab behavior, and no horizontal overflow. The focused authentication Playwright regression passed 2/2, including the new header-to-shell geometry assertions in both states; storefront typecheck and diff whitespace validation also passed. This change remains local and is not deployed.

## 44. Authentication wordmark and Google console cleanup — 2026-07-22

The desktop authentication artwork now leads with a larger cursive `Cruisin` wordmark, followed by `Ultra premium streetwear` on its own aligned line. A slow gold-to-white sweep gives the wordmark restrained motion with a static gold reduced-motion fallback. The Google Identity button integration was separated into one initialization effect and an independent render effect, preventing tab changes from repeatedly calling `google.accounts.id.initialize()`.

Manual browser QA covered Sign In and Create Account in a fresh configured-Google tab and confirmed no GSI warning after switching. The regression also supports CI's intentionally unconfigured Google state, where the disabled fallback remains visible and correctly sized.

## 45. Stable authentication artwork and simplified form heading — 2026-07-22

The left authentication image now renders inside a fixed 960px artwork stage, and a stable scrollbar gutter prevents the page width from shifting when the longer Create Account form introduces scrolling. The measured image rectangle is identical between Sign In and Create Account. The redundant oversized form heading is visually hidden while retained for screen-reader structure; the tabs continue to identify and switch the active mode. The cursive wordmark base gold and shadow were brightened slightly.

Manual QA at 1280 × 900 confirmed identical image position and dimensions across modes. Mobile QA at 390 × 844 confirmed the simplified hierarchy and zero horizontal overflow.

## 46. Final GitHub CI mirror — 2026-07-22

The repository was validated in an isolated Linux arm64 / Node 22 environment matching `.github/workflows/ci.yml`, with isolated MongoDB 7 and Redis 7 services. A clean `npm ci` completed with zero audited vulnerabilities after four non-breaking development-dependency lockfile updates. Workspace lint passed; 154 unit/integration tests passed; storefront, admin, and API production builds passed; MongoDB index creation and the 13-product seed passed; and the final Playwright run completed with 69 passed, 3 conditional skips, and 0 failures.

No environment file, Razorpay CSV, or API credential was added to Git. These changes remain local and are not committed, pushed, or deployed.
