Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Recovery and rollback

Authenticate the backup inventory first:

```sh
python3 scripts/v2-verify-backup.py /Users/gautam/Cruisin-Backups/2026-11-04_16-03-11 --key-file /Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key
```

For source recovery, decrypt checkout.tar.gz.enc to stdout and extract into a NEW private directory, never over the dirty original checkout. For Git recovery, decrypt all-refs.bundle.enc to a restricted temporary file, run git bundle verify, then git clone that bundle into a NEW directory. This restores refs/history; the full source archive restores dirty/ignored work and original Git internals.

For MongoDB recovery, verify the destination is a separate MongoDB 8.0 process with a fresh private dbpath, loopback binding and an unused port. Decrypt production.archive.gz.enc to mongorestore stdin with --archive --gzip --oplogReplay --stopOnError. Full oplog replay requires an unfiltered full dump; do not combine selective namespaces with an assumed full consistency guarantee. Compare dump-time counts, index definitions and representative application reads. Never use the production URI as the restore destination.

Production rollback was not tested. Existing deployment/image IDs are in 01-CURRENT-PRODUCTION.md. If production changes unexpectedly, stop work and report; do not initiate a rollback without explicit authorization. Code rollback and database restore are separate operations; destructive database restoration must have an independently reviewed target and data-loss plan. Cloudinary/media encrypted files map back to resource metadata via the deterministic SHA-256 resource-type/public-ID filename; the encrypted metadata retains original identity and delivery URLs.
