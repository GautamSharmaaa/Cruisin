# Cruisin Meta Pixel integration and verification

Date: 2026-08-05
Pixel: Cruisin Dataset SD (`1197303799247402`)
Currency: INR
Website: `https://cruisin.co.in`

## Repository audit

- The repository is an npm workspace with `client`, `admin`, and `server` applications.
- The customer storefront is `client`, using Next.js 15 App Router, React 19, TypeScript, Zustand, React Query, Vitest, and Playwright.
- The global storefront layout is `client/app/layout.tsx`.
- Product detail data loads in `client/components/product/product-page-client.tsx`, then renders the real variant selector, wishlist action, and add-to-cart action.
- Search submission and result selection live in `client/components/shared/search-modal.tsx`.
- Cart state is the persisted Zustand store in `client/store/cartStore.ts`; checkout starts from `client/components/cart/cart-summary.tsx`.
- Checkout, payment selection, COD creation, Razorpay launch, and Razorpay backend verification live in `client/app/(shop)/checkout/page.tsx` and `client/hooks/useCheckout.ts`.
- The success page does not trust URL parameters as an order. It fetches the authenticated order in `client/components/checkout/checkout-success.tsx` and applies `isOrderPaymentConfirmed` before rendering confirmation or tracking Purchase.
- Product, cart, order, shipping, discount, and payment values are stored in rupees. Razorpay alone converts rupees to paise at its SDK/provider boundary.
- No existing Meta Pixel, `fbq`, Facebook Pixel, GTM, storefront analytics utility, cookie-consent manager, or marketing-consent manager was found. The admin application and backend do not load the Pixel.

## Configuration and base integration

Set this in every deployed storefront environment:

```env
NEXT_PUBLIC_META_PIXEL_ID=1197303799247402
```

The value is documented in `client/.env.example`. It is public; no Meta CAPI access token is present or exposed.

`client/components/analytics/meta-pixel.tsx` uses `next/script` with `afterInteractive` loading. It creates the standard `fbq` queue, loads `https://connect.facebook.net/en_US/fbevents.js`, initializes the configured ID once, and delegates PageView tracking to the typed utility. `client/app/layout.tsx` installs it only in the customer storefront and contains the standard no-JavaScript fallback.

The existing Content Security Policy now permits only the required Meta origins for the library, event transport, and fallback image. If the environment variable is missing, the integration does not render Meta scripts, does not send events, does not crash, and emits one development warning.

Query-string changes are PageViews because Cruisin uses query parameters for genuine search, filter, collection, availability, and sort states. Hash-only changes are ignored.

## Files created or modified

Created:

- `client/components/analytics/meta-pixel.tsx`
- `client/lib/meta-pixel.ts`
- `client/lib/meta-ecommerce.ts`
- `client/lib/meta-actions.ts`
- `client/lib/meta-pixel.test.ts`
- `client/lib/meta-ecommerce.test.ts`
- `client/e2e/meta-pixel.spec.ts`
- `client/playwright.meta.config.ts`
- `docs/META_PIXEL_INTEGRATION_AND_VERIFICATION.md`

Modified:

- `client/.env.example`
- `client/app/layout.tsx`
- `client/app/(shop)/checkout/page.tsx`
- `client/components/cart/cart-summary.tsx`
- `client/components/checkout/checkout-success.tsx`
- `client/components/product/add-to-cart-button.tsx`
- `client/components/product/product-detail.tsx`
- `client/components/product/product-page-client.tsx`
- `client/components/product/wishlist-button.tsx`
- `client/components/shared/search-modal.tsx`
- `client/components/shop/product-card.tsx`
- `client/hooks/useCheckout.ts`
- `client/next.config.ts`
- `client/package.json`
- `client/store/cartStore.ts`
- `client/types/order.types.ts`
- `server/src/controllers/order.controller.ts`
- `server/src/models/order.model.ts`
- `server/src/services/order.service.ts`
- `server/src/services/order.service.checkout.test.ts`
- `server/src/validators/order.validator.ts`
- `server/src/validators/order.validator.test.ts`

## Event mapping

| Meta event | Trigger | Code location |
|---|---|---|
| `PageView` | Initial load and each distinct App Router pathname/query state; consecutive Strict Mode duplicates are suppressed | `client/components/analytics/meta-pixel.tsx`, `client/lib/meta-pixel.ts` |
| `ViewContent` | Valid product data has loaded; uses the first enabled in-stock/default variant and fires once for the rendered product view | `client/components/product/product-page-client.tsx`, `client/lib/meta-ecommerce.ts` |
| `Search` | Non-empty search form submission or selection of a loaded search result, never per keystroke | `client/components/shared/search-modal.tsx` |
| `AddToWishlist` | Authenticated add request succeeds; not on login prompt, removal, or failed request | `client/components/product/wishlist-button.tsx`, `client/components/shop/product-card.tsx`, `client/lib/meta-actions.ts` |
| `AddToCart` | The real Zustand cart accepts a valid selected/quick-add variant; no event for missing variants, invalid quantity, zero stock, or stock-cap rejection | `client/components/product/add-to-cart-button.tsx`, `client/components/shop/product-card.tsx`, `client/store/cartStore.ts`, `client/lib/meta-actions.ts` |
| `InitiateCheckout` | Authenticated customer follows checkout with a valid cart, or directly reaches checkout with a valid cart; session attempt guard prevents duplicates | `client/components/cart/cart-summary.tsx`, `client/app/(shop)/checkout/page.tsx`, `client/lib/meta-ecommerce.ts` |
| `AddPaymentInfo` | Customer changes to a valid enabled payment category; rerenders and the unchanged default selection do not fire | `client/app/(shop)/checkout/page.tsx` |
| `Purchase` | Authenticated order query returns a confirmed COD, paid, or partially-paid order that is not cancelled | `client/components/checkout/checkout-success.tsx`, `client/lib/meta-ecommerce.ts`, `client/lib/payment-status.ts` |

## Parameter and value mapping

- All commerce events use `currency: "INR"`.
- `content_type` is `product`.
- `content_ids` and `contents[].id` use the backend variant ObjectId exposed as `ProductVariant.id`. The existing API mapper has a legacy SKU fallback, but the production backend always supplies the variant `_id`.
- `contents` contains only non-empty IDs, positive integer quantities, and finite non-negative rupee prices.
- `ViewContent.value` and wishlist value are the default variant price.
- `AddToCart.value` is selected variant price multiplied by the quantity added by that successful action.
- Search includes the non-empty `search_string`, loaded preview-result count, and default variant IDs for loaded results.
- `InitiateCheckout` and `AddPaymentInfo` use the current UI checkout total from the existing discount and shipping calculation. They also include actual cart quantities and variant prices.
- `AddPaymentInfo.payment_method` is only `cod`, `online`, or `online_partial`.
- `Purchase.value` is the backend-confirmed `order.total`: merchandise subtotal minus discount plus shipping, tax, and any COD fee. It is not reconstructed in analytics code.
- `Purchase.order_id` is the non-sensitive internal order ID. Coupon code is included only when the confirmed order already contains it.

Invalid IDs, empty contents, empty searches, `NaN`, negative values, invalid quantities, and unconfirmed orders safely no-op. Payload building never mutates product, cart, or order state.

## Event IDs and future CAPI

- Interaction events use namespaced `crypto.randomUUID()` IDs, with a collision-resistant browser fallback.
- `InitiateCheckout` uses one `checkout:<uuid>` per session checkout fingerprint. Its fingerprint contains variant IDs, quantities, item prices, and coupon—not customer details. The ID is passed as `metaEventId`, validated by the server, and stored as `order.metaCheckoutEventId` for a future server event.
- `Purchase` always uses `purchase:<orderId>`. The backend can compute exactly the same ID from its confirmed order `_id` when CAPI is introduced.
- A successful browser Purchase is guarded in memory and under `cruisin:meta:purchase:<orderId>` in local storage, preventing rerender, Strict Mode, back-navigation, and refresh duplicates.
- No event ID contains name, email, phone, address, payment token, or other customer information.
- CAPI is intentionally not implemented. A future implementation should send server events only after the same authoritative order transitions and use `metaCheckoutEventId` or `purchase:<orderId>` as `event_id` for browser/server deduplication.

## Security, privacy, and consent

- No email, phone, address, password, OTP, Razorpay response, card number, CVV, UPI ID, bank data, secret, or payment token is placed in a Meta payload.
- The typed utility rebuilds allowlisted payload objects; arbitrary properties are not forwarded.
- Pixel code exists only in the customer storefront. The backend stores a non-sensitive event ID but sends no Meta/CAPI request. The admin application is unchanged.
- Automated browser tests fulfill the Meta library request locally and mock every commerce API. They make no real request to Meta, no real payment, and no real order.
- The repository has no cookie or marketing-consent system. Per task scope, no unrelated consent platform was invented. Before using the Pixel in jurisdictions or campaigns that require prior marketing consent, Cruisin's legal/account owner must decide and implement an appropriate consent policy.

## Automated and browser verification

Commands used for the dedicated implementation checks:

```bash
npm --workspace client run typecheck
npm --workspace client run test
npm --workspace server run test -- --run src/validators/order.validator.test.ts src/services/order.service.checkout.test.ts
npm --workspace client run test:e2e:meta
npm run lint
npm run typecheck
npm run test
NEXT_PUBLIC_META_PIXEL_ID=1197303799247402 npm run build
npm --workspace server run verify:logistics
npm --workspace client run test:e2e:logistics
```

Verified outcomes:

- Full workspace Vitest after the Shiprocket merge: server 32 files/204 tests, client 14 files/52 tests, admin 4 files/20 tests; **276 tests passed, 0 failed**.
- Every discovered non-destructive shipping/logistics test also passed explicitly: 15 server files/90 tests and the client shipping file/9 tests. The repository's focused Shiprocket suite passed 9 files/38 tests.
- Dedicated Meta Chromium funnel: 1 test passed. It covered initial and SPA PageView, Search, ViewContent, successful wishlist/cart, checkout, payment selection, a mocked Shiprocket quote, mocked COD confirmation, both checkout IDs, Purchase ordering/payload, single script installation, CSP compatibility, no PII, and no duplicate Purchase after refresh.
- Dedicated Shiprocket Playwright matrix: 8 tests passed in the isolated `cruisin-logistics-e2e` database with Redis DB 15, mock provider mode, and live reads/mutations disabled. It covered quote failures and recovery, prepaid/COD checkout, settlement, AWB/pickup/tracking, admin documents, outage retry, webhooks, NDR, RTO, returns, and exchanges.
- Independent in-app browser missing-environment smoke: zero Meta script tags, no `window.fbq`, one clear development warning, no horizontal overflow, and no Meta-related runtime error. Storefront product/search/wishlist guard/cart/checkout and valid/invalid Shiprocket quotes passed; admin overview/logistics/analytics/NDR/RTO passed with zero Meta scripts and zero runtime errors.
- Full workspace lint and type-check: passed for client, admin, and server.
- Production build with the configured Pixel ID: client, admin, and server passed. The optimized storefront generated all 36 static pages successfully.
- `git diff --check`: passed.
- Production-server smoke: CSP contained the required Meta origins and optimized HTML contained Pixel ID `1197303799247402` plus the no-JavaScript endpoint.
- There is no repository formatting script; no formatter result is claimed.
- No live payment, production order, Shiprocket API request, AWB, pickup, cancellation, or shipment was created during validation.

Environment/pre-existing observations:

- The sandboxed full-test attempt was blocked by `listen EPERM` in Supertest. The unchanged permitted rerun passed all 276 tests.
- After merging Shiprocket, the Meta fixture needed a mocked logistics quote before checkout could enable; the corrected isolated fixture now asserts both `logisticsQuoteId` and `metaEventId`.
- The Shiprocket Playwright test environment needed the newer `main` COD safeguards explicitly enabled. Both flags are true only in the isolated mock test configuration; production defaults remain false.

## Local testing

1. Copy the public Pixel ID into the local storefront environment only when intentionally testing Pixel behavior.
2. Run `npm run dev:client` and the required API/database services.
3. Use browser developer tools or Meta Pixel Helper to inspect `fbq`/network activity. Avoid completing a real charge.
4. For the safe automated funnel, run `npm --workspace client run test:e2e:meta`. It uses a dedicated port, mocked APIs, and an intercepted Meta script.
5. Run client unit coverage with `npm --workspace client run test`.

## Deployment and Meta Events Manager verification

After deployment, an owner with access to Cruisin Dataset SD must:

1. Configure `NEXT_PUBLIC_META_PIXEL_ID=1197303799247402` in the deployed customer storefront and rebuild/redeploy it.
2. Open Meta Events Manager and select **Cruisin Dataset SD**.
3. Open **Test Events**, enter/open `https://cruisin.co.in`, and confirm Pixel ID `1197303799247402`.
4. Visit the homepage, open a product, submit a search, add a wishlist item while authenticated, add the selected variant to cart, begin checkout, and choose a payment method.
5. Complete one approved safe test/COD order. Do not use real customer data or make an unapproved real charge.
6. Confirm `PageView`, `ViewContent`, `Search`, `AddToWishlist`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, and `Purchase` appear with variant IDs, positive quantities, rupee values, and `INR`.
7. Confirm Purchase appears only after the confirmed order, exactly once, with the final backend order total.
8. Refresh and navigate back to the success URL; confirm Purchase does not repeat.
9. Check **Diagnostics** for warnings and use the Meta Pixel Helper extension as an additional check.
10. Confirm there is no second installation through GTM or another deployment-layer script.

Events Manager account access is not available in this development environment, so the deployed Test Events/Diagnostics check remains an account-owner or advertising-agency responsibility.

## Known limitations and readiness

- Consent handling is absent in the current application and requires a separate legal/product decision.
- Meta Events Manager verification cannot occur until the environment variable is configured in the deployed build and an account owner performs Test Events/Diagnostics checks.
- Browser-side Meta requests can be blocked by tracking protection or ad blockers; storefront behavior continues normally.
- CAPI is not implemented because no CAPI access token was provided.

Final verdict: **Ready with stated manual verification**.
