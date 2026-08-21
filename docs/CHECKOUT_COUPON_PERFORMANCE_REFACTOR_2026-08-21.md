# Cruisin checkout and coupon performance refactor

Date: 21 August 2026
Branch: `codex/checkout-coupon-performance`

## Executive result

The Bag coupon action now issues one versioned coupon request instead of rebuilding the server cart during the click. Checkout no longer performs a redundant cart sync before placing an order. The server remains authoritative for products, variants, live prices, stock, discounts, delivery, COD eligibility, totals, payment state, and order state.

The checkout mutation window now uses customer-scoped idempotency, conditional inventory writes, atomic coupon reservations, short MongoDB transactions, immutable order snapshots, online stock reservations, and durable outbox jobs. Razorpay, email, fulfilment preparation, and customer-address synchronization are not allowed to extend a MongoDB transaction.

This work is code-complete and passes the repository quality gates listed below. Production latency targets are not claimed yet because no representative production or staging p50/p95/p99 sample was available, and the local default database is production-connected. The new instrumentation is the mechanism for collecting those measurements safely after rollout.

## Safety boundary used during this work

- No coupon, cart, order, customer, inventory, or payment mutation was run against the production-connected local environment.
- After a verified local backup, the guarded production index job was run through the Railway production environment on 21 August 2026. Its duplicate-data preflight passed, required indexes were verified, and the legacy global checkout-idempotency index was removed only after the customer-scoped replacement existed.
- Automated server tests explicitly used `mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests` with Shiprocket mutations disabled.
- Index creation and the legacy-index migration were exercised only against the allowlisted local database `cruisin-logistics-indexes`.
- Browser QA used the real local storefront with an isolated in-memory mock API. No real order or payment was submitted.

## Baseline audit

The only available latency baseline was the reported customer observation:

| Flow | Reported before | Measured p50 | Measured p95 |
| --- | ---: | ---: | ---: |
| Coupon apply/remove | approximately 3–8 seconds | unavailable | unavailable |
| COD checkout | approximately 2–3+ seconds | unavailable | unavailable |
| Online checkout to provider-ready | approximately 2–3+ seconds | unavailable | unavailable |

The code audit found these concrete causes:

- Coupon apply cleared the confirmed coupon, loaded the cart, performed one sequential item mutation per local line, synchronized the whole cart, and then posted the coupon.
- Coupon request count was `N + 3` for `N` Bag lines: one cart GET, `N` item writes, one cart sync, and one coupon POST.
- Checkout always issued `/cart/sync` immediately before the checkout request even though checkout repriced and revalidated the cart.
- Cart item validation performed product access per item instead of one product batch.
- Checkout product processing performed redundant product reads.
- Customer coupon use was read with a count-before-write pattern and global coupon usage was incremented separately.
- Stock could be vulnerable to read-then-write races.
- COD success could wait for address persistence, fulfilment preparation, and confirmation email.
- Online checkout had no expiring inventory reservation/recovery lifecycle around the Razorpay window.
- The old checkout idempotency index was global rather than scoped to customer plus attempt key.

## Implemented architecture

### Correlated performance instrumentation

- Coupon, cart, and checkout requests receive bounded correlation IDs such as `coupon-xxxxxxxx` and `checkout-xxxxxxxx`.
- The server returns `x-request-id` and `Server-Timing` for successful commerce requests.
- Structured `Commerce performance` logs contain only request ID, flow, total duration, and named stage durations. Tokens, payment credentials, and addresses are not logged.
- Server stages include auth, cart load/write, product load, coupon load/usage/calculation/reservation, bundle calculation, delivery validation, stock reservation, transaction, and Razorpay creation where applicable.
- The browser attaches the same correlation ID and records a Performance API measure where supported. Instrumentation failure is swallowed so it can never fail a commerce request.

### Continuously authoritative versioned cart

- Cart documents now persist a monotonically increasing `version` plus confirmed coupon state.
- Add, quantity update, removal, synchronization, coupon apply, and coupon removal are guarded writes that increment the version.
- The client applies cart changes immediately for responsiveness, serializes the corresponding server mutations, and replaces local state with each authoritative response.
- A stale mutation receives HTTP 409 plus the latest authoritative cart; the client reconciles and retries the mutation once.
- Coupon and checkout wait only for already-started cart mutations. They do not start a new full cart sync.

### One-request coupon flow

- Apply is one `POST /cart/coupon` with `{ code, expectedVersion }`.
- Remove is one versioned `DELETE /cart/coupon`.
- The previously confirmed discount remains visible while a replacement is applying.
- The server performs one product batch, loads coupon rules in parallel, checks actual historical plus immutable redemption usage, computes bundle and coupon savings, and writes one authoritative cart result.
- A delayed response cannot overwrite a newer cart version in the browser.
- `CRUISIN10` is explicitly fixed at one use per customer even if its stored limit is accidentally misconfigured. Other coupons retain configurable limits of 1, 2, 3, or N.

### Atomic coupon use

- `CouponUsageCounter` performs a conditional atomic increment under the configured per-customer limit.
- Immutable `CouponRedemption` rows carry a sequence and order reference.
- Compound unique indexes protect customer/coupon/sequence, order/coupon, and the customer/coupon counter.
- Checkout reconciles legacy paid-order history into the counter before reservation.
- Online attempts reserve coupon allowance and confirm it only after verified payment; failure, cancellation, or expiration releases it exactly once.

### Checkout critical path

- The browser sends one checkout request with the authoritative cart version and a stable idempotency key for that attempt.
- The server reloads the cart, batches all product and embedded variant data, and recalculates live price, bundle discount, coupon, shipping, COD fee, and final total.
- Product pricing, coupon loading, and site settings are read in parallel because they are independent after cart load.
- Coupon calculation and customer-usage validation are parallel after the coupon is known.
- Delivery quotes are bound to customer, address/postcode, payment mode, cart version, full priced-cart fingerprint, and expiry.
- A request hash prevents reuse of the same idempotency key for different checkout details.
- The database has a unique partial index on `(user, checkoutIdempotencyKey)`.
- A guarded index migration removes the old globally unique checkout-key index only after the customer-scoped replacement exists.

### Inventory, transactions, payment, and outbox

- Checkout inventory uses conditional `bulkWrite` filters for product state, variant state, live price, and sufficient stock inside the critical transaction.
- COD transaction scope is stock, coupon, order/address snapshot, quote consumption, cart deletion, and durable `order_created` outbox insertion.
- COD responds after commit. Email, fulfilment preparation/Shiprocket draft work, and customer address/profile synchronization run from the durable job.
- Online checkout reserves inventory and coupon allowance for 15 minutes inside the transaction, commits, and only then calls Razorpay/Stripe.
- Provider creation failure compensates stock, coupon, quote, and order state in a transaction.
- Reservation expiry is a durable scheduled job. It cannot race a payment settlement that has already acquired the settlement marker.
- Payment success remains server verified. Existing signature verification, provider order association, webhook event dedupe, and idempotent settlement remain active.
- `order_created` and reservation-release jobs use the existing Mongo-backed logistics job collection with leases, retries, bounded attempts, dedupe keys, dead state, and restart recovery.

## Network and query delta

| Customer action | Before | After |
| --- | --- | --- |
| Apply coupon with N Bag lines | `N + 3` requests | 1 coupon POST after any already-running mutation settles |
| Remove coupon | client-only clear or multi-step state behavior | 1 authoritative DELETE |
| Place COD order | cart sync + checkout = 2 requests | 1 checkout POST |
| Open online payment | cart sync + checkout = 2 requests | 1 checkout POST; Razorpay creation remains the required server-side external dependency |

Database/query changes:

- Cart item validation: per-item product access became one `$in` product batch plus one version-guarded cart write.
- Coupon: cart load, one product batch, coupon lookup, actual customer usage, calculation, and one cart write; independent reads overlap safely.
- Checkout: one product batch replaces redundant existence and pricing reads; product/coupon/settings reads overlap safely.
- Inventory: one conditional bulk operation replaces a non-atomic read/save sequence on the normal checkout path.
- External calls removed from COD response path: email, fulfilment/Shiprocket preparation, address-book persistence, and profile synchronization.

Exact transaction duration, database time, and third-party contribution are now emitted as stages. They were not fabricated for this report.

## Automated validation

The final validation gate runs:

- all server, client, and admin unit/integration tests: 452 passing tests across 81 files (server 347/52, storefront 79/22, admin 26/7);
- all workspace lint commands;
- all workspace TypeScript checks;
- optimized production builds for storefront, admin, and API;
- isolated index preflight, creation, verification, and guarded legacy checkout-index removal;
- `git diff --check`.

Covered scenarios include valid/invalid/expired/minimum coupons, used one-time offers, concurrent redemption, coupon plus bundle saving, stale cart versions, add/update/remove serialization, stale reconciliation, COD creation, duplicate COD idempotency, stock and price races, COD disablement, immutable address snapshots, cart cleanup, provider creation failure compensation, reservation expiry, settlement/expiry races, payment replay, webhook dedupe, outbox dedupe, retries, dead-letter behavior, and worker restart recovery.

## Browser validation

The actual local Cart page was opened against an isolated mock API with one authoritative product. A 600 ms coupon response delay was deliberately injected to make intermediate UI behavior observable.

Verified:

- the Bag rendered the authoritative item, coupon strip, reward widget, and total;
- clicking the strip immediately showed `APPLYING OFFER…` while the request remained unresolved;
- the previous total did not flash to an invented client value;
- success changed to `CRUISIN10 APPLIED` and displayed the authoritative ₹100 saving;
- the mock network ledger recorded exactly one `POST /cart/coupon` for the action;
- that request carried a `coupon-*` correlation ID;
- the applied state and alignment were visually inspected.

The 600 ms delay is a synthetic behavior test, not an after-performance measurement. A real COD submission and Razorpay payment were intentionally not sent through the production-connected local API.

## Honest before/after performance status

| Flow | Before observation | After p50 | After p95 | Status |
| --- | ---: | ---: | ---: | --- |
| Cart mutation | not recorded | not yet sampled | not yet sampled | instrumented; target `<500 ms` p95 remains to verify |
| Coupon apply | 3–8 s reported | not yet sampled | not yet sampled | requests collapsed to one; target `<700 ms` remains to verify |
| Coupon remove | 3–8 s flow family reported | not yet sampled | not yet sampled | one versioned write; target `<500 ms` remains to verify |
| Delivery quote | not recorded | not yet sampled | not yet sampled | version/fingerprint validation added; target `<700 ms` remains to verify |
| COD checkout | 2–3+ s reported | not yet sampled | not yet sampled | non-critical external work removed; target `<1 s` remains to verify |
| Online to provider-ready | 2–3+ s reported | not yet sampled | not yet sampled | DB transaction ends before provider call; target `<1.5 s` remains to verify |

Collect at least a representative canary/staging sample and calculate p50, p95, and p99 grouped by `flow`. For online checkout, report `razorpay.create` separately from application-owned time. Do not compare a single warm request with the reported before range.

## Required production rollout

1. Take and verify a restorable MongoDB backup.
2. Build the exact release commit.
3. The guarded one-off index job was completed against production after the backup using:

   ```sh
   npm --workspace server run db:indexes:production
   ```

   The job validated its target, failed closed on duplicate data, created required indexes, removed the obsolete global checkout-key index only after its replacement existed, and verified the resulting definitions.
4. Deploy the API before or together with the storefront so versioned responses are available when the new client starts sending mutations.
5. Confirm `Commerce performance` logs, `Server-Timing`, outbox processing, reservation release, and dead-job visibility.
6. Run a safe staging/test-mode end-to-end COD and Razorpay flow, including duplicate submission and webhook replay.
7. Canary production traffic, calculate p50/p95/p99, and compare against the targets before declaring the latency objective achieved.

## Residual operational notes

- MongoDB transactions require a replica-set-capable production MongoDB deployment.
- Durable jobs are at-least-once. Database markers and provider/job dedupe make normal re-delivery idempotent. Email providers without an idempotency key retain a narrow theoretical duplicate-send window if a process dies after provider acceptance but before the sent marker is written.
- Razorpay remains an unavoidable external component of online provider-ready latency; it is measured separately and never runs inside a MongoDB transaction.
- Representative staging/test-mode payment browser QA and production latency sampling remain release gates, not hidden assumptions.
