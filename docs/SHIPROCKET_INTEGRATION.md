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
- live reads, document generation, and shipment mutations have separate explicit guards;
- every user-triggered Shiprocket mutation requires an `admin` or `superadmin` role; managers retain read-only synchronization and local workflow access;
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
SHIPROCKET_ALLOW_LIVE_DOCUMENTS=false
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
SHIPROCKET_API_EMAIL=
SHIPROCKET_API_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=
SHIPROCKET_PICKUP_POSTCODE=
SHIPROCKET_WEBHOOK_SECRET=
```

Modes:

- `mock`: deterministic local behavior; every live permission must be false.
- `live-readonly`: authentication, rates, tracking, and reconciliation require `SHIPROCKET_ALLOW_LIVE_READS=true`. Label/invoice generation can be enabled separately with `SHIPROCKET_ALLOW_LIVE_DOCUMENTS=true`.
- `live`: provider mutations remain blocked unless `SHIPROCKET_ALLOW_LIVE_MUTATIONS=true`. Live reads must also be enabled because authenticated mutation responses are immediately reconciled from Shiprocket.

The base URL is a fixed validated literal. It is not caller-controlled.

## Checkout and shipment lifecycle

1. The browser synchronizes visible cart items to the authenticated server cart.
2. `POST /api/v1/logistics/quotes` reloads products and variants, calculates parcel measurements, requests rates, and stores a TTL quote.
3. Checkout accepts a quote ID and option code, never a trusted browser price.
4. The server validates quote ownership, expiry, destination, payment mode, cart fingerprint, option, and COD eligibility.
5. The order stores `logisticsQuoteId` and the exact shipping charge.
6. Trusted payment settlement or COD placement reserves inventory and creates an idempotent local shipment draft.
7. An admin or superadmin creates the provider order. Legacy automation remains feature-gated and must stay disabled when human-only mutation control is required.
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

For Cruisin's current human-operated mutation policy, keep all four automation flags above `false`. Once the separate live document/mutation permissions are intentionally enabled, API RBAC ensures that provider order creation, AWB assignment, pickup, documents, cancellation, and provider-backed return/exchange shipment creation can start only from an authenticated `admin` or `superadmin` request.

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

Customers have no internal-document route. Admin and superadmin dashboards retain both `Print label` and `Print invoice`; the buttons generate/reuse a short-lived provider document and open the Shiprocket PDF directly in the browser's native print/download view. They do not automatically control a physical printer. Direct thermal-printer automation requires a separate secured local print-agent integration and is intentionally outside this phase.

## Provider-authoritative synchronization

The top-of-page `Sync with Shiprocket` action is a read-only provider operation available to manager/admin/superadmin. It replaces the old local `Refresh` button and reconciles the oldest active Shiprocket shipments in a bounded batch. Webhooks remain the real-time primary path, the scheduled reconciliation command is the missed-webhook fallback, and the button is the manual recovery path.

Each supported snapshot applies provider order/shipment IDs, AWB, courier, mapped/raw status, pickup state/date, tracking scans, ETA, shipping mode, freight, COD charges, charged weight, other provider charges, and RTO charges when Shiprocket returns them. Missing provider fields are not fabricated and existing identifier conflicts fail closed. Shipment changes update order fulfilment only for forward shipments, invalidate order/logistics/analytics queries, and feed provider costs into logistics KPIs and courier analytics.

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

Viewer roles are read-only. Managers can synchronize provider truth, compare couriers, confirm local package data, and perform non-provider workflow actions. Only admin/superadmin can create a provider order, assign AWB, schedule pickup, generate label/invoice/manifest, cancel a provider shipment, or trigger provider-backed reverse/replacement shipments. RTO inventory restoration is also admin/superadmin only.

Endpoint payloads are implemented against the [official Shiprocket API documentation](https://apidocs.shiprocket.in/). Account-specific behavior must still pass read-only smoke verification before activation.
