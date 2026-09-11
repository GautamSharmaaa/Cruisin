# CRUISIN Promotion Experience Architecture Audit

Date: 20 August 2026
Repository: `/Users/gautam/Documents/Cruisin`
Base branch at audit time: `codex/production-reconcile-20260818`

## Current architecture

CRUISIN is an npm-workspaces monorepo with three TypeScript applications:

- `client`: Next.js 15 App Router storefront on port 3000.
- `admin`: Next.js 15 App Router Admin on port 3001.
- `server`: Express 5, Mongoose 8, MongoDB and Redis API on port 8000 under `/api/v1`.

The root scripts fan out lint, typecheck and build to all three workspaces. Vitest is installed in every workspace and Playwright is already installed in the storefront.

## Current storefront

- `client/app/layout.tsx` mounts React Query, authentication bootstrap, the storefront chrome and Meta Pixel once for the application.
- `client/components/layout/app-chrome.tsx` owns global UI including Navbar, Footer, Cart Drawer, bottom navigation and search. It is the appropriate non-blocking mount point for a browsing-only promotion popup.
- Product discovery uses App Router pages under `/`, `/shop`, `/category`, `/collections`, `/men`, `/women`, `/sale`, and `/product/[slug]`.
- The storefront design system already includes Radix Dialog, Framer Motion, shared Button/Input components, dark premium CSS tokens and accessible modal/drawer primitives. No new UI dependency is needed.
- The canonical full Bag page is `/cart` (`client/app/(shop)/cart/page.tsx`); an additional cart drawer is globally mounted. Both reuse `CartItem`, `CouponInput`, `CartSummary` and the Zustand cart.

## Current coupon flow

### Admin coupon management

- Coupon documents use `server/src/models/coupon.model.ts`.
- Existing fields cover code, percentage/fixed/free-shipping rule, minimum value, maximum discount, total/per-customer usage, product/category targeting, enabled state and start/end dates.
- Protected CRUD is at `/api/v1/admin/coupons`, mounted by `admin-management.routes.ts` with existing auth and role middleware.
- The Admin Discounts page is `/discounts` and uses `CouponManager`, React Query resource hooks, current Admin form controls and status components.

### Customer coupon application

- Manual application is `POST /api/v1/cart/coupon` with `{ code }`.
- `CartService.applyCoupon` loads the current server cart, resolves only an enabled coupon and calls `calculateCouponDiscount`.
- `calculateCouponDiscount` is the central eligibility and amount calculator for date range, aggregate usage, minimum order value, targets, percentage/fixed amount, cap and free shipping.
- The endpoint returns the server-confirmed code, monetary discount, free-shipping state and eligible subtotal.
- `CouponInput` first synchronizes the client cart to the server, calls this endpoint, and only then writes the confirmed values to the Zustand cart.
- Final order creation independently reloads the coupon and recalculates discount on the server. The client result is never authoritative for payment or order totals.

### Important existing constraint

The MongoDB cart document stores items but not an applied coupon. Applied coupon code/discount/free-shipping are persisted in the existing Zustand `cruisin-cart` state. That state is already the shared Bag/Checkout source, is sent as `couponCode` during checkout, and is revalidated by order services. The promotion feature must call the same application workflow and observe that same cart state; it must not add placement-specific booleans.

## Current cart flow

- `client/store/cartStore.ts` persists items, coupon code, discount and free-shipping state under `cruisin-cart`.
- Adding, removing or changing quantity clears the coupon, avoiding a stale client discount after cart changes.
- `CouponInput` performs best-effort cart reconciliation before applying a coupon.
- Cart drawer and `/cart` both calculate display totals from the server-confirmed coupon state, while checkout/order creation remains authoritative.
- The drawer currently renders items before the manual coupon field; the full Bag page has heading, item grid and summary sidebar. The requested marquee can be inserted beneath each Bag header without redesigning these surfaces.

## Current checkout flow

- `/checkout` is a client page protected by authenticated storefront state.
- `useCheckout` always synchronizes current cart items before creating a COD, partial or Razorpay checkout and injects the current Zustand coupon code.
- Checkout shows address, delivery quote, payment choices, submit action and `OrderSummary`.
- `OrderSummary` already uses `CouponInput`, displays the applied coupon and actual saving, includes shipping and the configured COD fee, and calculates only display totals.
- `OrderService` recalculates coupon, shipping, tax, COD fee and final total. Payment order creation consumes the server-created order totals.
- Razorpay is opened only after the server returns a payment session. A promotion popup must not mount/open on `/checkout`, `/checkout/pending`, `/checkout/success` or `/checkout/failure`; strip application must be disabled once checkout submission/payment launch starts.

## Current Admin structure

- The sidebar already has `Discounts`, `Storefront`, and `CMS`; a new top-level navigation item is unnecessary.
- The logical control surface is the existing `/discounts` page, above the coupon creation/list manager, because the experience links an existing coupon.
- Admin resources use React Query and the shared Axios API client.
- Admin cards, form sections, inputs, selects, buttons, status pills and inline success/error patterns are already available.
- Mutating settings is allowed for `manager`, `admin`, and `superadmin`; read-only `viewer` is blocked from writes by existing `requireRole` conventions.

## Current settings/CMS

- `SiteSettings` is an existing singleton document (`singletonKey: global`) used for storefront switches, delivery prices and payment-related values.
- Public `GET /api/v1/site-settings` and protected `GET/PUT /api/v1/admin/site-settings` already exist.
- Extending `SiteSettings` with a nested `promotionExperience` subdocument avoids a duplicate collection/settings engine.
- The generic public site-settings response currently includes fields that the storefront uses. A dedicated public promotion endpoint is still preferable so only the public-safe evaluated campaign is exposed and inactive/invalid campaigns return no marketing payload.
- CMS is homepage/page-section oriented and is not the correct home for cart/checkout behavior.

## Current analytics

- The storefront has a hardened Meta Pixel utility with dedupe for page view, product view, checkout and purchase standard events.
- There is no separate first-party generic analytics ingestion endpoint or GA/GTM adapter in this repository.
- Promotion interactions should use a small adapter beside the current analytics utilities. It can emit Meta `trackCustom` events when Pixel is present and a browser `CustomEvent` integration hook, while explicitly never emitting `AddToCart`, `InitiateCheckout`, `AddPaymentInfo` or `Purchase`.
- Impression dedupe must use stable campaign/placement/state keys in session storage plus an in-memory guard to cover React Strict Mode and remounts.

## Current cache strategy

- Public Express merchandising responses do not set cache headers except the homepage CMS endpoint.
- Client React Query defaults to a 60-second stale time with no focus refetch; individual hooks can override this.
- The promotion endpoint should return `Cache-Control: no-store` and its storefront query should use `staleTime: 0`, a 60-second refetch interval and focus refetch. This makes Admin updates visible immediately on new requests and within at most 60 seconds for an open storefront tab without disabling unrelated caches.
- Admin saving should update/invalidate its own React Query cache immediately.

## Proposed architecture

1. Extend the singleton `SiteSettings` model with an OFF-by-default `promotionExperience` nested document.
2. Add a promotion-experience validator with explicit length, placeholder, delay, frequency and schedule checks.
3. Add one backend service that:
   - returns the full Admin configuration plus populated linked coupon and calculated Admin status;
   - updates only this nested settings field;
   - centrally evaluates master state, schedule and linked coupon technical validity;
   - returns only the public-safe active representation, or `null` when inactive/invalid.
4. Add public `GET /promotion-experience` and protected Admin `GET/PUT /admin/promotion-experience` routes using existing auth/role middleware. The public response is no-store.
5. Add shared client types/template interpolation restricted to `{{code}}`, `{{discount}}`, and `{{saving}}`.
6. Extract the existing coupon sync/apply work into one reusable storefront function/hook. Manual input, popup, marquee and checkout strip all call this function and update the existing Zustand state only after server confirmation.
7. Mount a promotion runtime in AppChrome. It loads independently, fails closed, suppresses browsing popup on cart/checkout/payment/success contexts, and applies campaign-aware frequency storage.
8. Build responsive Radix Dialog popup, reusable Bag marquee and calm checkout strip with current components/tokens and reduced-motion CSS.
9. Insert the marquee beneath the heading in `/cart` and beneath the Cart Drawer title/content header. Insert the checkout strip below the checkout introduction and above checkout content.
10. Add a Promotion Experience panel to the existing Admin `/discounts` route with linked-coupon details, all switches/copy fields, delay/frequency/scheduling, calculated status and visual-only preview.
11. Add focused backend and frontend unit tests and Playwright coverage where the existing harness can exercise the flow without live payment calls.

## Files to modify

Expected existing files:

- `server/src/models/site-settings.model.ts`
- `server/src/services/merchandising.service.ts` (defaults only, unless isolated defaults are exported)
- `server/src/routes/v1/index.ts`
- `server/src/models/model-registry.ts` only if a new model becomes necessary (not planned)
- `client/store/cartStore.ts` only if a narrow hydration/state improvement is required
- `client/components/cart/coupon-input.tsx`
- `client/components/cart/cart-drawer.tsx`
- `client/app/(shop)/cart/page.tsx`
- `client/app/(shop)/checkout/page.tsx`
- `client/components/checkout/order-summary.tsx` only for coupon applied-state synchronization if needed
- `client/components/layout/app-chrome.tsx`
- `client/app/globals.css`
- `client/types/dto.types.ts`
- `admin/app/(dashboard)/discounts/page.tsx`
- `admin/hooks/useAdminResources.ts`
- `admin/types/dto.types.ts`

## Files to create

Expected new files (names may be adjusted to repository conventions during implementation):

- `server/src/services/promotion-experience.service.ts`
- `server/src/controllers/promotion-experience.controller.ts`
- `server/src/routes/v1/promotion-experience.routes.ts`
- `server/src/validators/promotion-experience.validator.ts`
- focused server tests for evaluation, validation and route authorization
- `client/types/promotion-experience.types.ts`
- `client/lib/promotion-experience.ts`
- `client/lib/promotion-analytics.ts`
- `client/hooks/usePromotionExperience.ts`
- `client/components/promotion/promotion-runtime.tsx`
- `client/components/promotion/promotion-popup.tsx`
- `client/components/promotion/promotion-marquee.tsx`
- `client/components/promotion/checkout-promotion-strip.tsx`
- focused Vitest tests and Playwright spec
- `admin/components/dashboard/promotion-experience-manager.tsx`
- `docs/admin-promotion-experience.md`

## Database changes

- No new collection.
- One nested `promotionExperience` subdocument on the existing `SiteSettings` singleton.
- Mongoose defaults keep the feature OFF for documents that predate deployment.
- No data migration is required; an Admin save materializes the nested configuration.
- `promotionId` references the existing Coupon collection. Deleting is currently implemented as deactivation, but the public evaluator also handles a missing reference.

## API changes

- `GET /api/v1/promotion-experience`: public-safe active payload or `null`; no-store.
- `GET /api/v1/admin/promotion-experience`: complete configuration, linked coupon summary and calculated status; authenticated Admin roles.
- `PUT /api/v1/admin/promotion-experience`: validated update for manager/admin/superadmin; viewer/customer/anonymous denied.
- Existing `POST /api/v1/cart/coupon` remains the sole customer apply endpoint.
- Existing checkout/payment/order APIs remain unchanged unless a test exposes a coupon synchronization bug.

## Risks and mitigations

- **Client/server cart split:** coupon state is persisted client-side, while cart items live in both client and server. Reuse the exact synchronization path before every promotional apply and preserve server revalidation at order creation.
- **Popup before cart contains items:** the current coupon API rejects an empty cart. The popup must surface the real safe error instead of pretending success; copying remains available. The brief's example of applying before add-to-cart cannot be truthfully completed under the current authoritative API without inventing a pending coupon system, so no pending/fake applied state will be added.
- **Usage-per-customer at cart application:** existing cart apply validates aggregate usage but final order service enforces customer usage. The promotion layer must not duplicate or weaken this behavior.
- **Expired config in an already open tab:** 60-second polling suppresses future rendering; a click still reaches backend validation and can fail safely if expiry occurs between polls.
- **Coupon changes after application:** existing quantity/item mutations clear coupon. Linked coupon deactivation is caught by refresh and always by final order validation.
- **Analytics provider gap:** custom promotion events can be dispatched through the existing Pixel/runtime hook, but there is no durable first-party analytics warehouse endpoint in scope. Document this behavior explicitly.
- **Scheduling timezone:** HTML `datetime-local` values will be converted to ISO instants in the Admin browser and stored as UTC Date values, matching current Mongo/JavaScript date handling. Admin status presentation uses `en-IN` in the Admin's local timezone.
- **Payment interference:** popup is never opened in checkout routes; apply buttons disable during their own request, and the checkout strip will disable once checkout mutation/payment launch begins.
- **Uncommitted files:** the base working tree contains pre-existing untracked audit/report artifacts and `.pnpm-store`. They must be preserved and excluded from this feature's commits.

## Audit decision

Proceed by extending `SiteSettings`, linking `Coupon`, centralizing backend active evaluation, reusing the existing coupon apply endpoint/Zustand cart state, and integrating the Admin UI into `/discounts`. No duplicate coupon calculator, promotion collection, state library, modal library or analytics lifecycle event will be introduced.
