# MongoDB backup report — VERIFIED isolated restoration

Recorded 2026-11-04T16:28:54.196813+05:30. This label verifies this captured backup and its isolated restore, not an untested future recovery or Atlas PITR coverage.

- Source: MongoDB Atlas, replica set atlas-f22j5l-shard-0; database cruisin; server 8.0.36. Atlas project ID, control-plane cluster name/tier and cloud snapshot policy are NOT VERIFIED.
- Logical size at inspection: 12,933,068 bytes; 52 application collections. Initial Mac free capacity was approximately 51 GiB.
- Account: authenticated atlasAdmin; read/list/oplog capabilities were verified. No permission change or source write was performed.
- Start: 2026-11-04T10:36:10.228356+00:00; end: 2026-11-04T10:36:24.710318+00:00.
- Command: `mongodump --config <private-config> --oplog --archive --gzip --numParallelCollections=1 --readPreference=secondaryPreferred`, streamed directly into encryption. The config contained the URI outside argv/logs and is now retained only encrypted.
- Tool versions: mongodump/mongorestore 100.16.1, darwin arm64. Source 8.0.36; isolated destination 8.0.34.
- Encrypted file: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/mongodb/production.archive.gz.enc` (1,451,408 bytes).
- Encryption: AES-256-CBC, salted PBKDF2 200,000 iterations; separate random key file `/Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key`. HMAC-authenticated SHA-256 inventory must be checked before recovery.
- Dump exit 0; encryption exit 0. Full-replica-set oplog capture succeeded with one entry; restore replay succeeded. One parallel collection and a small dataset limited read pressure, but production CPU/IO telemetry was not captured, so exact resource impact is NOT VERIFIED.

The live logical dump plus oplog replay provides a captured consistency window for this replica-set backup without stopping checkout. Cross-provider state (payments, shipping, Redis, Cloudinary) is not atomically snapshotted. This is not an Atlas infrastructure backup. DDL/unsupported operations or oplog rollover can invalidate future dumps; do not reuse this method without checking topology/capabilities and successful restore evidence.

## Restore evidence

A fresh MongoDB process used dbpath `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/mongodb/restore-test-data`, bound only to 127.0.0.1:27982. It was distinct from production and the synthetic V2 MongoDB on 27983. Decryption streamed into `mongorestore --uri mongodb://127.0.0.1:27982/ --archive --gzip --oplogReplay --stopOnError --numParallelCollections=1`; decrypt and restore exited 0.

All 52 collection counts match the dump's recorded counts: 13,224 documents. All 376 index definitions across those collections match source definitions after order normalization. Documents were readable in every collection, including correctly handled empty collections. Product/Category application-model reads succeeded; variants were readable; all 328 orders had matching user records. Full business, inventory, accounting and other relationships were not exhaustively audited.

A separate safety check verified temporary process dbpath/port/bind address before shutdown. Its stopped data files were encrypted as `mongodb/verified-restore-data.tar.gz.enc`, decrypted and tar-listed successfully. Only that checked temporary plaintext directory was removed after confirming its port was closed. The source encrypted dump was preserved. No customer backup data was placed in V2 development or hosted staging.

## Collection inventory at dump time

| Collection | Documents |
|---|---:|
| addresses | 304 |
| authproviders | 426 |
| banners | 1 |
| carts | 124 |
| catalogueexports | 5 |
| catalogueimports | 5 |
| cataloguesettings | 1 |
| categories | 62 |
| cmsmedias | 0 |
| cmspages | 1 |
| cmssections | 17 |
| cmsversions | 66 |
| collections | 24 |
| couponredemptions | 99 |
| coupons | 26 |
| couponusagecounters | 87 |
| exchangerequests | 4 |
| inventories | 0 |
| invoice_download_statuses | 204 |
| invoicecounters | 1 |
| invoices | 224 |
| invoicesettings | 0 |
| logisticsaudits | 2744 |
| logisticsjobs | 1895 |
| logisticsnotificationevents | 997 |
| logisticsquotes | 0 |
| logisticswebhookevents | 1735 |
| megamenucollectioncards | 6 |
| megamenucolumns | 16 |
| megamenulinks | 95 |
| megamenupromos | 5 |
| navigationitems | 5 |
| newslettersubscribers | 0 |
| notifications | 998 |
| orderdeletetombstones | 0 |
| orders | 328 |
| otps | 0 |
| packagepresets | 0 |
| pagesettings | 16 |
| paymentwebhookevents | 193 |
| products | 65 |
| returnrequests | 3 |
| reviews | 1 |
| securityevents | 975 |
| shipments | 262 |
| sitesettings | 1 |
| tags | 27 |
| userpreferences | 239 |
| users | 402 |
| usersessions | 96 |
| wallets | 40 |
| wishlists | 399 |

## Recovery procedure

1. Keep this backup and the separate recovery key protected; make an offline/offsite protected copy. Run `python3 scripts/v2-verify-backup.py /Users/gautam/Cruisin-Backups/2026-11-04_16-03-11 --key-file /Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key` and require HMAC and all SHA-256 checks to pass.
2. Start a fresh, isolated MongoDB 8.0 process using a NEW dbpath and loopback port. Independently confirm its identity and empty destination before restoring. Never use the production URI or an accessible hosted staging database.
3. With shell pipeline failure handling enabled, stream decryption into restore:

```sh
set -o pipefail
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:/Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key \
  -in /Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/mongodb/production.archive.gz.enc \
| mongorestore --uri mongodb://127.0.0.1:27982/ --archive --gzip \
  --oplogReplay --stopOnError --numParallelCollections=1
```

4. Compare the dump-time inventory above and saved index definitions; verify representative schemas/relationships and application reads. Do not compare exact counts to a changing live production DB.
5. Retain the encrypted source backup; inspect process/path identity separately before cleaning up any temporary restoration.

Evidence: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/mongodb-verified.json`, `mongodump.log`, `mongorestore.log`, `backup-collection-counts.json`, `restored-collections.json`, `index-comparison.json`, `application-restore-reads.json`, `restore-safety-check.json` and authenticated manifests. Remaining gaps: Atlas project/tier and PITR settings, exact production performance telemetry, Redis RDB recovery and a full cross-service consistency audit. Official method references: [MongoDB dump behavior](https://www.mongodb.com/docs/database-tools/mongodump/mongodump-behavior/) and [backup and restore with tools](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/).
