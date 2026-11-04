Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Start local V2

Use Node 22.23.1. A checksum-verified official standalone distribution is at `/Users/gautam/.local/share/cruisin-tools/node-v22.23.1-darwin-arm64/bin`. MongoDB 8.0 was installed alongside 7.0; its binary is used explicitly without replacing the existing mongod symlink or starting a system service. Homebrew upgraded dependency packages; a separate Node 22 distribution avoids resulting Homebrew shared-library incompatibilities. No existing production-host process was involved.

```sh
cd /Users/gautam/.codex/worktrees/cruisin-v2/Cruisin
export PATH=/Users/gautam/.local/share/cruisin-tools/node-v22.23.1-darwin-arm64/bin:$PATH
npm run v2:infra
npm run v2:api
# separate terminals, same directory and PATH:
npm run v2:storefront
npm run v2:admin
```

Storefront http://127.0.0.1:3192; admin http://127.0.0.1:3193; API http://127.0.0.1:8192/ready. MongoDB 27983, database cruisin-v2-local; Redis 6392, database 0. Tests use cruisin-sync-order-analytics-tests on the dedicated local MongoDB and Redis database 14. Files persist in `~/.local/share/cruisin-v2/`, never the restore-test directory.

The safe launcher discards inherited provider/database variables and loads only V2's private server/.env. Frontends have independent .env.local files, no production credentials and no Meta Pixel ID. Application env validation runs before database clients. Notifications are suppressed by APP_ENV, workers are suppressed outside production, webhooks return 403, and provider credentials remain synthetic. The V2 production guard requires an explicit future release flag; it is not set.

Synthetic fixture seeding was executed via `node scripts/v2.mjs seed`: 13 products and a development admin. The existing seed's local-only test credentials are used by the repository browser tests; do not expose these instances publicly. No production records were copied to local development. Ctrl-C stops each app; databases are dedicated daemons and intentionally remain available. Do not run destructive docker compose down commands against other projects.

```sh
npm run v2:test
node scripts/v2.mjs lint
node scripts/v2.mjs typecheck
npm run v2:build
# stop development frontends while building; use built servers for browser smoke:
node scripts/v2.mjs storefront-built
node scripts/v2.mjs admin-built
npm run v2:e2e
```

Do not run development and build processes simultaneously against the same .next directory. Tests have placeholder payment/shipping providers; no genuine sandbox payment or shipment was exercised.
