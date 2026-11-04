Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# CRUISIN V2 setup results

Production remains live with unchanged active deployment IDs and domain routing. All three production HTTP checks returned 200.

Encrypted complete source archive, encrypted Git bundle, configuration exports, an oplog-backed MongoDB dump and original Cloudinary media are local at `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11`. The MongoDB dump was restored and verified: 52 collections, 13,224 documents, matching index definitions, successful application model reads and zero missing user references among 328 orders.

V2 is at `/Users/gautam/.codex/worktrees/cruisin-v2/Cruisin`, branch `codex/cruisin-v2`, base `4e51d77d89f8eda6ff3e04a3300967e9b042765d`. `/Users/gautam/Documents/Cruisin-V2` is a convenience symlink to the managed worktree. The original checkout was preserved byte-for-byte across 45,330 files excluding Git internals and archive platform metadata.

Local API/storefront/admin run on loopback ports 8192/3192/3193; MongoDB/Redis use 27983/6392. Seeded data is synthetic. Hosted staging remains stopped by your explicit choice. This is a completed local setup with blocked hosted/release work, not a completed production launch.

Validation: 578 unit/integration tests, 12 browser smoke cases across four browser projects, lint/typecheck and three production builds passed. Critical dependency advisories were removed in V2; one high Zod advisory and 19 lower advisories remain. The CI audit gate intentionally blocks release pending remediation. Full historical browser/logistics suites and remote CI have not been certified.
