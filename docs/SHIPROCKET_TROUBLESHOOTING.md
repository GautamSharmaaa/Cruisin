# Shiprocket Troubleshooting

## Quote says cart is empty

The storefront must synchronize its local visible cart before requesting a quote. Confirm `PUT/POST /cart/items` succeeds and the access token belongs to the same user calling `/logistics/quotes`.

## Quote expired or bag changed

Quotes are intentionally short-lived and fingerprint product, variant, quantity, and server price. Refresh delivery options after any cart, destination, payment-mode, or price change. Never reuse a consumed quote.

## Missing package measurements

Live modes reject missing/zero product or variant weight/dimensions. Add measured kg/cm values or an active package preset. Mock fallback warnings are test-only and cannot create a live provider order.

## Live operations are disabled

- Reads require `live-readonly` or `live` plus `SHIPROCKET_ALLOW_LIVE_READS=true`.
- Mutations require `live` plus `SHIPROCKET_ALLOW_LIVE_MUTATIONS=true`.
- Automatic AWB can follow either manual or automatic provider-order success, but still requires confirmed measurements and a selected courier. Automatic pickup can follow either manual or automatic AWB success.

Do not bypass these guards in code.

## Provider authentication

Check server-only email/password, account access, fixed base URL, clock, outbound network, and sanitized `authentication` errors. Tokens are cached conservatively, refreshed through a single-flight promise, and retried once after 401.

## Timeout, 429, or outage

Timeouts, network failures, 429, and 502/503/504 are retryable. Jobs use bounded backoff and eventually become dead for admin review. Validation, serviceability, duplicate, and other permanent errors are not blindly retried.

## Provider order stuck pending

Inspect the local Shipment and job. A `pending_provider` shipment indicates an interrupted or concurrent attempt. Do not create a new local order. Reconcile by source order ID with Shiprocket before manually retrying.

## Webhook rejected

Confirm the provider-neutral URL, HTTPS, `x-api-key`, JSON content type, body under 1 MB, and a recognized identifier plus status. Duplicate events return 200 with `duplicate: true`.

## Tracking appears to move backward

Terminal and ranked status rules ignore stale downgrades. Raw provider status is retained for diagnosis. If the current provider state is truly different, reconcile through the admin tracking action and audit before changing normalization.

## NDR or RTO is missing

Confirm the status normalized to `ndr` or an `rto_*` state and that the webhook matched AWB/provider IDs. Use the dedicated `/admin/logistics/ndr` and `/admin/logistics/rto` APIs, not order payment status.

## RTO stock not restored

Warehouse receipt must be recorded before inspection pass. Restoration atomically claims `Order.stockReserved` so a repeated action cannot double increment. If a product update fails after the claim, the order timeline and shipment show inventory review/warehouse pending; reconcile quantities manually before retry.

## Return refund is pending

The return workflow does not move money through Shiprocket. Use the existing Razorpay refund operation on the order, synchronize provider status, then mark the return refunded/closed.

## Safe disable

Turn off the feature and worker using the rollback values in `SHIPROCKET_PRODUCTION_CHECKLIST.md`. Local shipment/job/audit data should remain intact for reconciliation.
