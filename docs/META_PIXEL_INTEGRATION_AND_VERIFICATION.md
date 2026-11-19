# Cruisin Meta Pixel and Conversions API

With a dataset configured, the storefront starts Meta Pixel and Conversions API tracking on the first eligible page. Shoppers can turn marketing cookies off for their browser using **Cookie settings** in the storefront footer or under **Profile → Preferences**. The API records whether tracking started by default or by a shopper's choice. The browser and API use the same event name and ID so Meta can deduplicate the two deliveries. [Meta deduplication guide](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events)

Cruisin sends one explicit PageView for each eligible navigation and disables the Pixel's automatic history tracking. [Meta Pixel template](https://github.com/meta/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl)

## Storefront events

| Event | Trigger |
| --- | --- |
| PageView | An eligible storefront page opens or its route changes |
| ViewContent | A product loads |
| Search | A search is submitted or a result is opened |
| AddToWishlist | A shopper successfully saves a product |
| AddToCart | The server confirms the item and quantity added |
| InitiateCheckout | A shopper starts a checkout with items in the cart |
| AddPaymentInfo | The API accepts an order with the shopper's selected payment method |
| Purchase | A COD order is placed, Razorpay captures the full online payment, or Razorpay captures the required advance on a partial-payment order |

Purchase uses the order total in INR and the event ID `purchase:<order ID>`. On a partial-payment order, that value is the booked order total. Commerce events identify items by their backend variant IDs. Use those same IDs in the Meta catalog feed. [Meta event parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/custom-data)

The browser can send Purchase after it receives the server's confirmation. The outbox can send Purchase even if the shopper closes checkout before returning from payment. A payment authorization alone leaves the online order pending. The API rechecks pending deliveries against consent and current order status. Failed deliveries retry for transient errors, and the original event ID is used on every attempt. [Razorpay integration checklist](https://razorpay.com/security/checklist)

## Configure Railway and Events Manager

Use an isolated staging dataset first. In **Events Manager → Data sources**, select the dataset. Under **Settings → Conversions API**, generate its access token and copy the dataset ID. Open **Test Events** to get the staging event code. [Meta CAPI setup](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api)

| Railway service | Variable | Value |
| --- | --- | --- |
| Storefront | `NEXT_PUBLIC_META_PIXEL_ID` | Dataset ID. Applied when the storefront is built. |
| Storefront | `NEXT_PUBLIC_META_MARKETING_DEFAULT` | Defaults to `opt-out`. Use `opt-in` where prior permission is required. Applied when the storefront is built. |
| Storefront | `NEXT_PUBLIC_SITE_URL` | Public storefront origin. Use the staging origin for testing and `https://cruisin.in` after the domain cutover. |
| API | `CLIENT_URL` | Same storefront origin, used to authorize storefront requests and build event source URLs. |
| API | `META_PIXEL_ID` | Same dataset ID as the storefront. |
| API | `META_CAPI_ACCESS_TOKEN` | Dataset access token. Store it as an API service secret. |
| API | `META_CAPI_ENABLED` | Optional. CAPI turns on automatically once the dataset ID and token are set. Set `false` to pause CAPI. |
| API | `META_GRAPH_API_VERSION` | Defaults to `v27.0`. |
| API | `META_TEST_EVENT_CODE` | Required when CAPI is enabled in staging. Omit in production. |

Apply the registered MongoDB indexes with `npm --workspace server run db:indexes:production` from the built release against the intended environment. After the supported services are configured, deploy the API and rebuild the storefront. Admin and Employee require no Meta variables.

Both channels honor the shopper's saved preference, Global Privacy Control, and Do Not Track. CAPI receives allowed storefront paths without query strings, attribution cookies when present, and the request's IP address and browser user agent. Purchase can include SHA-256 hashes of verified account email and phone. Raw search terms, credentials, and payment details are excluded. [Meta customer information parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters)

## Verify before production activation

1. In staging, open **Test Events** and visit the staging storefront with a fresh browser profile. In opt-out mode, verify that PageView appears on arrival. In opt-in mode, select **Allow marketing** before checking for a PageView.
2. Exercise the storefront events. For events present in both channels, verify the Browser and Server sources, identical IDs, and deduplication.
3. Place a staging COD order and complete a Razorpay test checkout. Verify one Purchase per confirmed order with INR, the server's order total, and the expected variant IDs. Reload the confirmation page and check that it adds no Purchase. Use a failed or authorized-only online payment to verify that it produces no Purchase.
4. Turn off marketing under **Profile → Preferences → Cookie settings** and confirm that subsequent actions produce no new events, including after a reload. Review **Diagnostics** and **Event Match Quality**, check for a duplicate Pixel installation in any tag manager, and confirm the intended storefront domain in Meta. [Meta setup verification](https://developers.facebook.com/documentation/ads-commerce/conversions-api/verifying-setup)

## Local checks

- `npm --workspace client test` checks Pixel consent and commerce event construction.
- `npm --workspace client run test:e2e:meta` exercises the storefront with a fake Pixel library and mocked commerce and conversion endpoints.
- `npm --workspace server test -- --run src/services/meta-conversion.integration.test.ts src/services/payment.service.test.ts` checks API validation, MongoDB queue delivery, retry, withdrawal, and payment capture. Use the repository's isolated MongoDB replica set and Redis test configuration.

Local tests simulate Meta delivery. Events Manager receipt, deduplication, and Event Match Quality are staging checks for the configured dataset.
