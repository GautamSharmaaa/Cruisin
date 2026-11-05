# Database Migrations

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: additive local changes IMPLEMENTED.

No production migration ran. Existing local Mongo27983 was verified by exact bind/port/dbpath, then converted to a single-node replica set with `scripts/v2-enable-replica.mjs`; startup infra now preserves this configuration. Transactions are mandatory for integrated stock writes. Standalone transactions fail closed and are regression-tested.

New collections are additive: employees, employee sessions/OTPs, employee tasks, approval requests, operations audit/notifications, stock movements, variant labels/packing verification, SOP documents/versions/acknowledgments, media assets/grants/migrations, physical units/receipts, operational exceptions, fulfillment records, courier measurement policies and unit label config. Schema names follow Mongoose naming conventions. Existing variants add stockRevision, damagedStock, unitTracked; orders add packingVerifiedAt; shipment documents add verificationId.

Unique indexes cover employee ID/phone, session hash, OTP identity, notification dedupe, approval request idempotency, ledger idempotency, unitId/code, receipt key, fulfillmentKey/order, publication/ack version, and media source mapping. Compound unit variant/state/time indexes support allocation. Query pagination is capped. Unit receipt creates multiple records with ordered:true inside a transaction.

Opening backfill command defaults to dry run; `node scripts/v2.mjs inventory-backfill --apply` is explicitly local-only and idempotent. Executed twice locally without production targets. It never adjusts availability. Unit conversion refuses nonzero legacy stock or active legacy reservations; a counted conversion/reconciliation plan is required before real cutover.

Zod upgraded to 4.6.7 through reviewed record/coercion/resolver changes. PATCH outer defaults are stripped to prevent resetting unspecified properties. Framework Next15.5 is unchanged. `npm audit` has zero high/critical findings; remaining lower-severity advisories are recorded in test results.
