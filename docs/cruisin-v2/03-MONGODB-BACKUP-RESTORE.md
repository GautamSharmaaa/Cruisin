Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# MongoDB backup and restore

See [MONGODB_BACKUP_REPORT.md](../../MONGODB_BACKUP_REPORT.md) for the collection inventory, exact backup window, tools and restore commands. The database is Atlas MongoDB 8.0.36, replica set atlas-f22j5l-shard-0, database cruisin. Logical data at inspection: 12,933,068 bytes. About 51 GiB local free storage was available initially.

Read-only inspection used a one-connection pool. The supplied account has atlasAdmin, more privilege than necessary; no permissions were changed. For future recurring backups, obtain a dedicated backup/read account with a separately approved production access change.

The supported mongodump 100.16.1 full replica-set dump used --oplog, --gzip, --archive, --numParallelCollections=1 and secondaryPreferred. It completed in about 15 seconds, captured one oplog entry and did not pause production. The full dump includes application collections; managed Atlas control-plane settings, search index services, cluster users and infrastructure are not a portable reconstruction of Atlas itself.

Restore used the same Database Tools version into a dedicated loopback-only MongoDB 8.0.34 process on 27982, with --oplogReplay and --stopOnError. All 52 collection counts matched dump-time counts, all index definitions matched after canonical comparison, application Product/Category model reads passed, and all 328 restored orders had user references. This is not a full business-accounting or cross-service consistency audit.

The temporary process was stopped only after checking its dbpath, port and bind address. Its data directory was encrypted and decrypt/list verified, then plaintext removed after a separate path and process safety check. The encrypted source dump and encrypted verified restore files remain. The synthetic development database is a different process, directory and port.

Atlas project/cluster tier, scheduled cloud snapshots and PITR retention remain NOT VERIFIED because no Atlas control-plane credential was available. The successful oplog restore proves this captured logical backup is recoverable; it does not prove future or historical PITR coverage. Use Atlas snapshots if DDL, unsupported operations or sustained write volume invalidate future logical backups. Official references: [MongoDB dump behavior](https://www.mongodb.com/docs/database-tools/mongodump/mongodump-behavior/) and [backup with tools](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/).
