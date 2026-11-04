# CRUISIN V2 setup — local complete, hosted staging stopped

Recorded 2026-11-04T16:28:54.196813+05:30. [Final verification](docs/cruisin-v2/FINAL-VERIFICATION.md) lists PASS, FAIL, BLOCKED and NOT VERIFIED individually. This report does not certify a hosted staging launch or production release.

## 1. Production status

V1 storefront, API and admin return HTTP 200. All active deployment IDs and routing maps remain unchanged: storefront 7e8dda84-4427-4a0c-918e-006a2e499e1d at 8e72f8ddff6f752e1e9e77d009677a57b51ff2d9; API 25192a4d-6a56-4826-b6a9-a5cc5e6f8a94 at 4e51d77d89f8eda6ff3e04a3300967e9b042765d; admin 82d74bd2-0d98-468f-8a75-05f0491b3e7b at 8f27b9e5d76253f3e0e0079d3bad01d69a518c75; Redis 6048e26f-6dec-4171-91ce-3d3789dc7813, redis:8.2.9. No production change or transaction test was performed.

## 2. Local backups

Root: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11` (0700). Original checkout encrypted archive: 590,336,032 bytes. Git bundle encrypted: 52,288,112 bytes. MongoDB encrypted source dump: 1,451,408 bytes. Cloudinary originals: 754 assets, 1,492,308,407 source bytes, 1,492,741,136 encrypted bytes including metadata. Configuration exports are encrypted. Exact final file inventory, aggregate payload size and authenticated SHA-256 checksums are at `manifests/inventory.json`, `manifests/summary.json`, `manifests/SHA256SUMS` and `manifests/inventory.hmac-sha256`.

Encryption uses salted AES-256-CBC/PBKDF2 200,000 iterations and a separate random recovery key at `/Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key` (0600). Key contents were never displayed or committed. Authenticate the inventory before decrypting. Decrypt/list verification and original file comparison passed; all original 45,330 compared files and original Git status are preserved. No backup was uploaded.

## 3. MongoDB restoration

VERIFIED: actual isolated restore into MongoDB 8.0.34 of the 8.0.36 Atlas replica-set dump. All 52 collections, 13,224 documents and index definitions match; application-model reads and 328 order/user references pass. Source dump captured/replayed one oplog entry. Temporary restored customer data was checked, stopped, encrypted and removed from plaintext storage after separate safety checks. The synthetic local V2 DB never received it. See [backup report](MONGODB_BACKUP_REPORT.md).

## 4. Development environment

Managed worktree `/Users/gautam/.codex/worktrees/cruisin-v2/Cruisin`; convenience symlink `/Users/gautam/Documents/Cruisin-V2`; branch codex/cruisin-v2; clean starting base 4e51d77d89f8eda6ff3e04a3300967e9b042765d. Prepared setup changes remain local for review; no commit or push was required. Original checkout and BOGO/analytics work remain intact. Local storefront http://127.0.0.1:3192, admin http://127.0.0.1:3193, API readiness http://127.0.0.1:8192/ready. Use Node 22 and the safe commands in [local development](docs/cruisin-v2/05-LOCAL-DEVELOPMENT.md).

## 5. Staging environment

Created separate Railway project [cruisin-v2-staging](https://railway.com/project/cb62553d-5a32-4534-8c82-98e009958d64) and all four empty service shells. IDs are in [Railway staging](docs/cruisin-v2/06-RAILWAY-STAGING.md). You explicitly chose to keep hosted services stopped. No staging database, deployable pushed commit, public domain, private access policy or live deployment exists. No production variables were inherited. Build/source manifests and a disabled successful-CI deployment workflow are prepared; command overrides were not persisted by Railway and are not claimed configured.

## 6. Environment isolation

Independent loopback MongoDB/Redis, synthetic data/provider credentials, sanitized launcher environment, pre-connection production-target rejection, nonlocal browser-target rejection, suppressed notifications/durable workers and disabled webhooks. No production credential or customer dataset was copied into V2. See [isolation evidence](docs/cruisin-v2/07-MONGODB-ISOLATION.md). Original V1 .env still targets production: do not start its backend for development.

## 7. Checkout testing

Current local Razorpay/COD flows remain synthetic. A disabled Fastrr provider interface is prepared; genuine custom-site protocol, sandbox keys, signature rules, gateway/COD/refund responsibilities and reservation/reconciliation behavior remain BLOCKED. Provider compatibility evidence and prerequisites are in [checkout testing](docs/cruisin-v2/09-FASTER-CHECKOUT-TESTING.md).

## 8. CI/CD readiness

PASS: 578 unit/integration tests, 12 browser smoke cases across Chromium/mobile Chromium/Firefox/WebKit, lint, typecheck, all three builds and supplemental secret scan. V2 dependency updates remove all critical findings; 1 high Zod advisory, 15 moderate and 4 low remain. The high-severity audit gate blocks release until a reviewed migration. Full historical E2E/logistics suites and remote CI are NOT VERIFIED. No main protection or production auto-deploy setting changed.

## 9. Documentation index

- [00-EXECUTIVE-SUMMARY.md](docs/cruisin-v2/00-EXECUTIVE-SUMMARY.md)
- [01-CURRENT-PRODUCTION.md](docs/cruisin-v2/01-CURRENT-PRODUCTION.md)
- [02-LOCAL-BACKUP.md](docs/cruisin-v2/02-LOCAL-BACKUP.md)
- [03-MONGODB-BACKUP-RESTORE.md](docs/cruisin-v2/03-MONGODB-BACKUP-RESTORE.md)
- [04-GIT-WORKTREES.md](docs/cruisin-v2/04-GIT-WORKTREES.md)
- [05-LOCAL-DEVELOPMENT.md](docs/cruisin-v2/05-LOCAL-DEVELOPMENT.md)
- [06-RAILWAY-STAGING.md](docs/cruisin-v2/06-RAILWAY-STAGING.md)
- [07-MONGODB-ISOLATION.md](docs/cruisin-v2/07-MONGODB-ISOLATION.md)
- [08-CLOUDFLARE-ROUTING.md](docs/cruisin-v2/08-CLOUDFLARE-ROUTING.md)
- [09-FASTER-CHECKOUT-TESTING.md](docs/cruisin-v2/09-FASTER-CHECKOUT-TESTING.md)
- [10-CI-CD.md](docs/cruisin-v2/10-CI-CD.md)
- [11-TEST-RESULTS.md](docs/cruisin-v2/11-TEST-RESULTS.md)
- [12-PRODUCTION-LAUNCH.md](docs/cruisin-v2/12-PRODUCTION-LAUNCH.md)
- [13-ROLLBACK-RECOVERY.md](docs/cruisin-v2/13-ROLLBACK-RECOVERY.md)
- [14-SECURITY-CHECKLIST.md](docs/cruisin-v2/14-SECURITY-CHECKLIST.md)
- [15-MANUAL-ACTIONS.md](docs/cruisin-v2/15-MANUAL-ACTIONS.md)
- [FINAL-VERIFICATION.md](docs/cruisin-v2/FINAL-VERIFICATION.md)

## 10. Final approval and blocker checklist

Complete: source/config/history preservation, encrypted MongoDB backup with real isolated restore, Cloudinary upload export, independent V2 workspace, local application setup and safe smoke verification, stopped Railway service shells, documentation and recovery manifest verification.

Deferred by your choice: hosted staging spending/startup and all dependent hosted checks. Future explicit production approval is required for branch-protection/auto-deploy changes, deployments, variables, routing, migrations or rollback. Missing access/protocol: Atlas/Cloudflare control-plane exports, safe Redis snapshot export, private/authenticated/external-media coverage and Fastrr sandbox docs/keys. Release blocker: Zod major migration and full remote regression/CI validation. No approval is needed to retain and use the completed local environment.
