# Shiprocket Production Checklist

Do not enable live mutations until every item below is complete.

## Application and data

- [x] Node 22 is declared and was used for the Phase 2 dependency and verification commands.
- [x] Next.js, PostCSS, sharp, and Mongoose advisories were remediated without `--force`; `npm audit --omit=dev` returned zero vulnerabilities after the upgrades.
- [ ] `npm ci`, typecheck, lint, all tests, logistics verification, and production builds pass.
- [ ] Existing baseline E2E failures are triaged; no logistics regression is hidden by them.
- [x] Stable isolated Playwright coverage is present for prepaid, outage/retry, NDR, RTO, return, exchange, and document/print UI flows and is wired into CI.
- [ ] Record a successful local/CI execution of the isolated Playwright matrix. The 2026-07-28 local attempt was blocked before tests started because the execution approval service could not allow local server sockets after its usage limit was reached.
- [ ] `npm --workspace server run db:indexes:production` succeeds.
- [ ] Product and variant weight/dimensions are complete, positive, and confirmed.
- [ ] Package presets and maximum quantities match warehouse practice.
- [ ] Pickup location name and pincode exactly match the Shiprocket account.
- [ ] Redis and Mongo health/readiness checks pass.
- [ ] The separate logistics worker is deployed and monitored.

## Secrets and environment

- [ ] Shiprocket credentials exist only in server secret storage.
- [ ] `SHIPROCKET_WEBHOOK_SECRET` is strong and unique.
- [ ] Logs and client bundles contain no Shiprocket password/token/webhook secret.
- [ ] Start with `SHIPROCKET_MODE=live-readonly`.
- [ ] Set `SHIPROCKET_ALLOW_LIVE_READS=true`.
- [ ] Keep `SHIPROCKET_ALLOW_LIVE_MUTATIONS=false`.
- [ ] Keep all automatic mutation flags false.

## Read-only validation

Run only against the intended account:

```bash
npm --workspace server run shiprocket:smoke:readonly -- \
  --confirm-read-only-account \
  --delivery-postcode=560001
```

The script refuses mutation permission, automation flags, the worker, mock/live mutation modes, and unknown arguments. It validates authentication, the configured pickup location/postcode, prepaid and COD serviceability, courier IDs/names, INR charge fields, kg/cm input units, and expected-delivery fields. It prints only a sanitized summary and exits non-zero on malformed responses. Do not run it until credentials are supplied manually.

## Controlled mutation validation

Use a disposable order ID:

```text
CRUISIN-INTEGRATION-TEST-<timestamp>
```

Temporarily enable `SHIPROCKET_MODE=live` and live mutations only during the approved test window. Validate create order, duplicate request handling, AWB, pickup, label/invoice/manifest, tracking, cancellation, and webhook delivery.

Cleanup requires both an integration-test identifier and explicit confirmation:

```bash
npm --workspace server run shiprocket:cleanup:live -- \
  --confirm-live-account \
  --test-order-id=CRUISIN-INTEGRATION-TEST-<timestamp> \
  --awb=<test-awb>
```

This command is never run by CI or startup.

## Observability and operations

- [ ] Alerts cover dead jobs, provider authentication, elevated 429/5xx, stale tracking, NDR age, RTO age, and fulfilment errors.
- [ ] Dashboard roles are verified with real staff accounts.
- [ ] Webhook `x-api-key`, dedupe, out-of-order, replay, and malformed payload cases are tested.
- [ ] Support has NDR/RTO/return/exchange runbooks.
- [ ] Finance validates provider costs versus customer shipping charges.
- [ ] Payment capture succeeds even when the logistics mock simulates an outage.

## Activation

Enable in stages:

1. live read-only;
2. live manual create order;
3. manual AWB/pickup/documents;
4. worker reconciliation;
5. automatic create;
6. optional automatic AWB and pickup.

At each stage, reconcile local Shipment IDs, Shiprocket IDs, AWB, order count, inventory, and payment totals before continuing.

## Rollback

Set:

```env
SHIPROCKET_ENABLED=false
SHIPROCKET_ALLOW_LIVE_READS=false
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
SHIPROCKET_AUTO_CREATE_ORDER=false
SHIPROCKET_AUTO_CREATE_COD_ORDER=false
SHIPROCKET_AUTO_ASSIGN_AWB=false
SHIPROCKET_AUTO_SCHEDULE_PICKUP=false
LOGISTICS_EMAIL_NOTIFICATIONS_ENABLED=false
LOGISTICS_SMS_NOTIFICATIONS_ENABLED=false
LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED=false
LOGISTICS_WORKER_ENABLED=false
```

Stop the worker, retain logistics records for reconciliation, and use fixed-rate checkout. Do not delete or rewrite orders, captured payments, shipments, inventory history, jobs, or audits.

No deployment was performed as part of this implementation.
