# Shiprocket Local Testing

Local and automated testing must use `SHIPROCKET_MODE=mock`. No Shiprocket credential is required and no Shiprocket hostname is contacted.

## Start dependencies

```bash
docker compose up -d mongo
docker run --name cruisin-redis -p 6379:6379 -d redis:7-alpine
```

Use a dedicated database such as:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/cruisin-logistics-local
REDIS_URL=redis://127.0.0.1:6379
SHIPROCKET_ENABLED=true
SHIPROCKET_MODE=mock
SHIPROCKET_ALLOW_LIVE_READS=false
SHIPROCKET_ALLOW_LIVE_DOCUMENTS=false
SHIPROCKET_ALLOW_LIVE_MUTATIONS=false
SHIPROCKET_PICKUP_LOCATION=Mock Warehouse
SHIPROCKET_PICKUP_POSTCODE=560001
SHIPROCKET_WEBHOOK_SECRET=local-only-random-secret
```

Seed and start the API, storefront, and admin app with the normal workspace commands.

## Deterministic fixtures

| Pincode or identifier | Result |
| --- | --- |
| `560001` | prepaid and COD; surface and express |
| `110001` | prepaid only |
| `999999` | not serviceable |
| `500500` | retryable timeout |
| `429429` | retryable rate limit |
| `503503` | temporary outage |
| AWB containing `NDR` | NDR tracking |
| AWB containing `RTO` | RTO in transit |
| AWB containing `RTODELIVERED` | RTO delivered |
| AWB containing `DELIVERED` | delivered |

Mock prepaid rates are ₹92 surface and ₹148 express. Mock COD rates are ₹130 and ₹190 including COD charges.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run verify:logistics
npm test
npm run build
```

`verify:logistics` disables the feature for the legacy full suite, pins the provider mode to mock, and runs all workspace lint/type-check/tests/builds before a focused enabled-mock logistics suite and a post-build frontend bundle secret scan. It never enables live reads, documents, or mutations.

## Manual happy path

1. Create and verify a local customer.
2. Add one visible, in-stock variant.
3. Enter a supported six-digit pincode at checkout.
4. Confirm standard/express rates and payment-mode-specific COD charges.
5. Place a COD order or complete a mock payment settlement.
6. Open Admin → Logistics.
7. Create provider order → assign AWB → schedule pickup → refresh tracking.
8. Open the customer tracking URL and confirm courier/AWB/scans.
9. Replay an identical webhook and confirm `duplicate: true`.

Example webhook:

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/logistics-events \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-only-random-secret' \
  -d '{"awb":"MOCKAWB123456","current_status":"NDR"}'
```

## Exception paths

- Change the mock AWB scenario to NDR, refresh, and record a reattempt.
- Move to RTO In Transit, record warehouse receipt, then inspection pass/fail.
- An inspection pass uses the order’s `stockReserved` flag as an idempotency claim before returning quantities to product variants.
- Create a return only for a delivered order inside the 14-day window.
- Create an exchange, reserve replacement stock, create reverse pickup, receive/QC, and create the replacement shipment.

Keep test data in its own database. Do not point manual tests at production MongoDB, Redis, payments, or a live Shiprocket account.
