# Shiprocket Integration

Cruisin’s logistics layer is provider-neutral at controllers, checkout, jobs, and persistence. Shiprocket is the first adapter; the deterministic mock implements the same interface and is the default.

## Architecture

```text
Storefront/Admin
      |
Express routes + Zod + RBAC
      |
Quote / Logistics / Return-Exchange services
      |
LogisticsProvider interface
   |                |
Mock provider   Shiprocket adapter
                     |
              typed HTTP client
```

The provider interface covers authentication, pickup-location validation, serviceability/rates, provider-order creation, courier/AWB assignment, pickup, label/invoice/manifest, tracking, cancellation, and reverse shipment.

Key safety rules:

- credentials and bearer tokens never reach the browser;
- mock mode performs no external request;
- live reads and live mutations have separate explicit guards;
- Shiprocket failure cannot roll back or downgrade a captured payment;
- payment, order, fulfilment, shipment, return, exchange, and refund states remain separate;
- provider mutations are idempotent locally and errors remain visible;
- terminal shipment status cannot be downgraded by stale tracking;
- unconfirmed mock package measurements cannot create a live provider order.

## Configuration

Copy `server/.env.example` and keep the feature disabled until local mock verification succeeds.

```env
LOGISTICS_PROVIDER=shiprocket
SHIPROCKET_ENABLED=false
SHIPROCKET_MODE=mock
SHIPROCKET_ALLOW_LIVE_READS=false
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
SHIPROCKET_API_EMAIL=
SHIPROCKET_API_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=
SHIPROCKET_PICKUP_POSTCODE=
SHIPROCKET_WEBHOOK_SECRET=
```

Modes:

- `mock`: deterministic local behavior; both live permissions must be false.
- `live-readonly`: authentication, rates, and tracking only; `SHIPROCKET_ALLOW_LIVE_READS=true`.
- `live`: mutations remain blocked unless `SHIPROCKET_ALLOW_LIVE_MUTATIONS=true`.

The base URL is a fixed validated literal. It is not caller-controlled.

## Checkout and shipment lifecycle

1. The browser synchronizes visible cart items to the authenticated server cart.
2. `POST /api/v1/logistics/quotes` reloads products and variants, calculates parcel measurements, requests rates, and stores a TTL quote.
3. Checkout accepts a quote ID and option code, never a trusted browser price.
4. The server validates quote ownership, expiry, destination, payment mode, cart fingerprint, option, and COD eligibility.
5. The order stores `logisticsQuoteId` and the exact shipping charge.
6. Trusted payment settlement or COD placement reserves inventory and creates an idempotent local shipment draft.
7. If automatic creation is enabled, a durable Mongo job is enqueued. Otherwise an admin creates the provider order.
8. AWB, pickup, documents, tracking, NDR, and RTO state live on `Shipment`.

When `SHIPROCKET_ENABLED=false`, the pre-existing fixed-rate checkout remains active.

## Package calculation

Measurements use variant overrides first, then product values. Product weight is multiplied by quantity, packaging weight is included, and dimensions are composed conservatively. Package presets and per-package maximum quantities are enforced.

Mock mode may use the explicit 0.25 kg / 20×15×3 cm test fallback and records a visible warning. Non-mock modes reject missing, zero, invalid, oversized, or unconfirmed measurements.

## Webhooks

Configure the provider callback to:

```text
POST /api/v1/webhooks/logistics-events
x-api-key: <SHIPROCKET_WEBHOOK_SECRET>
```

The route name intentionally does not expose the provider. The API key comparison is timing-safe. The handler validates and limits the body, stores a unique fingerprint, finds a shipment by AWB/provider IDs, normalizes status, deduplicates scans, bounds scan history, and rejects terminal downgrades.

## Jobs and recovery

`logistics-worker.ts` uses durable Mongo jobs plus a short Redis claim lock. Jobs have unique dedupe keys, leases, attempt caps, exponential backoff, sanitized errors, and dead-letter visibility in the admin API.

Run separately:

```bash
LOGISTICS_WORKER_ENABLED=true npm --workspace server run dev:logistics-worker
```

The API process does not run provider mutations during startup.

## Automatic fulfilment

The stages are independently controlled:

```env
SHIPROCKET_AUTO_CREATE_ORDER=false
SHIPROCKET_AUTO_CREATE_COD_ORDER=false
SHIPROCKET_AUTO_ASSIGN_AWB=false
SHIPROCKET_AUTO_SCHEDULE_PICKUP=false
```

Prepaid auto-create is reached only after trusted payment settlement. COD uses its separate flag. Auto-AWB is queued only after provider-order success with confirmed package measurements and a selected courier. Auto-pickup is queued only after AWB success. Every stage has a deterministic dedupe key, and a failed stage does not enqueue its successor. Keep automatic AWB and pickup disabled in the initial production configuration.

## Customer logistics notifications

The provider-neutral notification event service covers 18 shipment, NDR/RTO, return, and exchange events. A unique semantic key prevents webhook or job replays from sending an event twice. Each event records channel, template, recipient, status, attempt count, timestamps, and a sanitized error.

- In-app uses the existing `Notification` model.
- Email uses the existing SendGrid utility.
- SMS and WhatsApp use optional Twilio adapters.
- Customer order-email, in-app, SMS, and WhatsApp preferences are enforced.
- Server configuration can disable the service or any external channel.
- Automated tests suppress outbound email, SMS, and WhatsApp.
- A channel failure is recorded but does not fail shipment processing.
- Failed/partial events are visible at `GET /api/v1/admin/logistics/notifications?status=failed`.

External channels are disabled by default and are not operational until their sender, consent, and production delivery checks pass.

## Documents and printing

Label, invoice, and manifest generation use an atomic pending claim. Ready metadata stores generation and expiry timestamps; expired temporary URLs are regenerated. The admin-only metadata endpoint revalidates URL protocol and refuses missing, failed, or expired documents:

```text
GET /api/v1/admin/logistics/:shipmentId/documents/:kind
```

Customers have no internal-document route. The admin exposes loading, success, failure, and `Print Label` states. `Print Label` opens the browser print flow; it does not automatically control a physical printer. Direct thermal-printer automation requires a separate secured local print-agent integration and is intentionally outside this phase.

## API surface

Customer:

- `POST /api/v1/logistics/quotes`
- `GET /api/v1/orders/:id/tracking`
- `POST /api/v1/fulfillment/returns`
- `POST /api/v1/fulfillment/exchanges`
- `GET /api/v1/fulfillment/mine`

Admin:

- shipment list/KPIs/analytics/NDR/RTO/jobs/notification failures;
- package confirmation and courier comparison;
- provider order, AWB, pickup, label/invoice/manifest generation and secure document metadata, tracking, cancellation;
- NDR reattempt/contact/RTO actions;
- RTO warehouse receipt and inspection;
- return and exchange queues/actions.

Viewer roles are read-only. Manager/admin/superadmin can run shipment workflow actions. RTO inventory restoration is admin/superadmin only.

Endpoint payloads are implemented against the [official Shiprocket API documentation](https://apidocs.shiprocket.in/). Account-specific behavior must still pass read-only smoke verification before activation.
