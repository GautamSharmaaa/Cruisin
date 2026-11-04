Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Fastrr readiness

Provider branding is fastrr Checkout. Its [official product site](https://checkout.shiprocket.in/) lists custom-platform compatibility; [Shiprocket TechSphere](https://www.shiprocket.in/techsphere/) also describes custom-stack support. This supports potential compatibility, not a verified Next.js/Express SDK contract. The existing [Shiprocket logistics API](https://apidocs.shiprocket.in/?version=latest) is not proof of checkout API access.

No merchant-specific checkout API/SDK documentation, sandbox endpoint/keys, signature protocol, settlement/refund contract or custom integration approval was supplied or found in available local configuration. Live provider testing is BLOCKED. No guessed endpoints, SDK calls or signature algorithms were implemented.

server/src/services/checkout-provider.ts defines a disabled provider boundary: integer-paise amounts, checkout-intent/reservation IDs, idempotency key, expiry, provider session ID and verified paid/COD/failed/expired event mapping. Both methods fail closed. It is not wired into live routes.

Before integration obtain: authenticated session-create API and SDK contract; sandbox mode and test identities; gateway ownership and payment capture authority; webhook raw-body/signature/timestamp/replay specification; COD and partial payment behavior; reservation expiry; cancellation/refund ownership and reconciliation APIs. Existing order.service.ts already holds checkout idempotency and coupon reservation logic; payment.service.ts holds provider payment/refund and Razorpay webhook verification. Preserve server-authoritative pricing and stock checks. Never accept browser-return status as payment confirmation.

Implementation sequence: persist an internal checkout intent; reserve stock/coupons atomically; create one provider session with stable idempotency; persist provider mapping; verify and deduplicate signed events; reconcile gateway amount/currency; finalize order once; release reservations on expiry/failure; record refunds and cancellation responsibilities. This is proposed architecture, not a tested Fasterr integration. Synthetic COD/cart tests do not establish provider COD support.
