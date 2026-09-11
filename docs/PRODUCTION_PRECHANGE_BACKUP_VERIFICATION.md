# Production Pre-change Backup Verification

Verified on 2026-08-11 before any application source change for the Shiprocket synchronization, order management, and analytics work.

## Source

- MongoDB host type: Atlas
- Database: `cruisin`
- Classification: production
- Credentials configured: yes
- Credentials or connection URI recorded in this document: no

## Dump and checksum

- Started: 2026-08-11T14:05:36+05:30
- Finished: 2026-08-11T14:05:44+05:30
- Exit code: 0
- Archive size: 295,123 bytes
- Archive permissions: `600`
- SHA-256 sidecar permissions: `600`
- SHA-256 verification: `OK`
- Backup storage: outside the repository in the owner-only `Cruisin-Production-Backups` directory

## Local restore

- Local MongoDB: 7.0
- Target: `mongodb://127.0.0.1:27017/cruisin-prechange-restore-check`
- Started: 2026-08-11T14:07:33+05:30
- Finished: 2026-08-11T14:07:43+05:30
- Exit code: 0
- Result: success
- Collections restored and readable: 44

All business and logistics collection counts matched the read-only production comparison. The live `usersessions` collection changed from the 552 records captured in the archive to 555 records at comparison time. This is plausible live drift for a TTL-indexed session collection and does not affect commerce, payment, product, order, shipment, refund, return, exchange, or logistics integrity.

## Important restored indexes

Indexes were present and readable for:

- `orders`
- `shipments`
- `logisticsjobs`
- `logisticsquotes`
- `logisticswebhookevents`
- `logisticsnotificationevents`
- `logisticsaudits`
- `paymentwebhookevents`
- `returnrequests`
- `exchangerequests`

## Verdict

`PASS`

The dump, checksum, localhost restore, collection reads, plausible count comparison, and important-index inspection all passed. Production documents modified during backup verification: 0. Production indexes modified: 0. Production destructive commands: 0.
