# Shiprocket delivery timestamp correction

## Cause

Shiprocket tracking for `CR-MTYQSBAE-PDT9I` returned the unzoned timestamp
`2026-09-15 15:08:00`. The UTC production host interpreted it as 15:08 UTC,
so the application displayed 20:38 IST and the stored delivery confirmation
was in the future. The correct instant is `2026-09-15T09:38:00.000Z` (15:08 IST).
The storefront and return/exchange API correctly rejected the future date.

## Correction

- Parse unzoned Shiprocket SQL/ISO timestamps explicitly as IST, independent of host timezone.
- Preserve explicit UTC/offset timestamps; reject malformed and ambiguous dates.
- Apply the same parser to polling, webhook scans, pickup dates, and estimated delivery.
- Use the courier delivery summary or original delivered scan, not the latest arbitrary tracking update or sync time.
- Fresh provider-verified sync can repair matching legacy scans and fingerprints without duplicate events.
- Repeated later delivery confirmations cannot extend the original five-day return/exchange window.
- Keep cancelled, undelivered, expired, missing-confirmation, and future-confirmation orders ineligible.

## Historical repair safeguards

`server/src/scripts/repair-shiprocket-delivery-timestamps.ts` has two explicit modes:

- `--plan /absolute/path/plan.json`: reads active, non-cancelled forward delivered shipments and courier tracking; writes a private local BSON-preserving before/after plan, but performs no production writes.
- `--apply /absolute/path/plan.json`: applies that plan within one hour, preserving a separate private backup first. Compare-and-set filters reject concurrently changed shipments and recheck order eligibility.

Both modes require `SHIPROCKET_MODE=live-readonly` and
`SHIPROCKET_ALLOW_LIVE_MUTATIONS=false`. Planning also requires live reads enabled.
Supply the target environment through the deployment platform; never copy credentials into source.
No labels, courier orders, pickups, notifications, refunds, or payments are created by this repair.
Only shipment delivery dates, proven shifted scan dates/fingerprints, latest tracking time,
and the shipment modification timestamp are updated. Orders, costing, analytics amounts,
and invoice snapshots are not rewritten.

The September 15 read-only plan identified 49 unambiguous delivered-record corrections
and 585 matching scan corrections, including both currently future-dated deliveries.
Unavailable courier history and ambiguous delivery dates are not guessed or bulk-shifted.
Repair artifacts belong under the ignored `output/` directory and must not be committed.

## Verification before deployment

- Workspace TypeScript checks passed.
- Server: 62 files / 418 tests passed.
- Storefront: 24 files / 90 tests passed.
- Admin: 9 files / 31 tests passed.
- Browser regression: 24 desktop/mobile checks passed, including recovery after the timestamp correction.
- Storefront, admin, and API production builds passed.
- Frontend Shiprocket secret scan passed (217 built files).

Browser tests intercept provider/payment requests and do not create live transactions.
After deployment, verify the reported order's tracking API returns 09:38 UTC,
eligibility is true within its original window, and production has no future delivered dates.
Inspect repair counts and concurrent-change skips before claiming historical repair complete.
