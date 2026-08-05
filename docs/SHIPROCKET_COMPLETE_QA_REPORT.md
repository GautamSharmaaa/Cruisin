# Shiprocket Complete QA Report

## Release decision

**NO-GO** for a controlled live mutation and **NO-GO** for the next read-only Shiprocket stage under the requested gate order.

The local implementation has strong automated evidence, but the final isolated index run is blocked by legacy index options and the manual storefront/admin gate is not fully green. The real Shiprocket read-only smoke was therefore not executed.

## Revision and environment

- Branch: `main`
- Revision: `744639e`
- Worktree: uncommitted integration changes
- Node: `v22.23.1`
- npm: `10.9.8`
- Provider during all execution: mock
- Live reads: disabled
- Live mutations: disabled
- Deployment: none
- Real notifications: none

## Command evidence

| Command | Result | Duration / notes |
| --- | --- | --- |
| `npm ci` | Pass | 9.44 s after sandboxed attempt was interrupted; deprecation warnings for `scmp`, `node-domexception`, and Recharts |
| `npm run lint` | Pass | 6.84 s |
| `npm run typecheck` | Pass | 6.16 s |
| `npm test` | Pass | 3.07 s; server 202, storefront 37, admin 20 = **259/259** |
| `npm run build` | Pass | 23.45 s; storefront 36 pages, admin 23 pages, server TypeScript |
| `npm run verify:logistics` | Pass | 39.61 s; repeated static/tests/build, **38/38** focused logistics tests, secret scan of 205 built files |
| `npm run test:e2e:logistics` | Pass | **8 passed (15.5 s)** |
| `npm audit --omit=dev` | Pass | 0.60 s; **0 vulnerabilities** |
| Guarded isolated index command | Fail | 0.42 s; legacy sparse `awb_1` conflicts with corrected partial unique index |

The first sandboxed `npm test` and index attempts failed with loopback `EPERM`; both were rerun with local-process permission. Those failures are test-environment noise, not product assertions.

## Changed-code and safety audit

Every integration-related changed file is catalogued in `SHIPROCKET_FINAL_CHANGE_AUDIT.md`. No source change was proven accidental. `docs/CODEBASE_ARCHITECTURE_AUDIT.md` is broader than this integration and should be reviewed separately before a future commit.

Safety audit result:

- no `NEXT_PUBLIC_*` Shiprocket credential;
- no provider token in client/admin source or built bundles;
- E2E used local MongoDB and Redis DB 15;
- all recipients were `example.test`;
- outbound email, SMS and WhatsApp were disabled;
- logs redact tokens, addresses, email, phone and recipient fields;
- no Shiprocket request was made;
- no deployment was made.

The repository's normal `server/.env` resolves to remote Atlas and Upstash configuration and was deliberately not used for QA.

## Automated contract and workflow results

- 120 targeted mock/contract tests passed across the final contract bundle.
- Authentication failure, token cache/coalescing, one-time 401 refresh, timeout, 429, 502/503/504 retry, permanent 422, malformed responses and mutation refusal passed with mocked Axios.
- All provider-neutral mock operations passed, including order, AWB, pickup, documents, tracking, cancellation, return and replacement shipment.
- Package authority tests passed for product/variant values, quantities, packaging, presets, missing/invalid/oversized data and stripped client charges.
- Quote tests passed for ownership, expiry, address/payment/cart/catalog staleness and manipulated option/amount scenarios.
- Webhook tests passed for keys, bounds, identifiers, replay, order, terminal downgrades, malformed timestamps and single notification.
- Automation's five flag combinations passed.
- Captured Razorpay payment survived a one-time provider outage; the durable retry created no duplicate shipment/provider order.
- NDR, RTO, return and exchange Playwright workflows passed.

## Bugs found and fixes made

1. A stale quote could survive a product parcel-data change. The quote fingerprint now includes product/variant weight and dimensions, package preset, packaging weight and maximum package quantity.
2. Webhook timestamps accepted malformed/future values. Validation now requires parseable, bounded timestamps and bounded scan text.
3. Test notification setup produced fake SendGrid key warnings. SendGrid initialization is deferred until an enabled production send; tests use disabled/mocked adapters.
4. The E2E browser matrix lacked several checkout safety assertions. The existing eight-scenario suite now also checks invalid/non-serviceable pincodes, prepaid-only COD rejection and duplicate COD submission.
5. Multiple shipment drafts collided on compound sparse provider-ID indexes because MongoDB indexed `{provider, providerOrderId: null}`. Shipment identifiers now declare partial unique indexes that include only string identifiers. This fixed the outage Playwright scenario.

## Database/index result

Target validation is strict:

- requires `ALLOW_ISOLATED_INDEX_VALIDATION=true`;
- accepts only `mongodb://`;
- accepts only `localhost` or `127.0.0.1`;
- requires database exactly `cruisin-logistics-indexes`;
- logs only sanitized host/database;
- uses `createIndexes()`;
- never calls `syncIndexes()`, drops a database, deletes documents, or drops an index.

The remote-host negative test refused an Atlas-style URI before connecting and did not print credentials.

Final isolated state:

- host: `127.0.0.1:27017`
- database: `cruisin-logistics-indexes`
- collections: 44
- documents: 0
- documents deleted: 0
- indexes removed: 0

The final command stopped at `awb_1` because the database already contains the earlier sparse unique index while the corrected schema requests a partial unique index. The same legacy form remains for provider order and provider shipment IDs. No prohibited removal was performed. Consequently, the final 12-index verification did not run and must not be claimed.

Safe remediation requires a separately approved isolated index migration/recreation, followed by the exact guarded command. Any non-isolated environment must receive an explicitly reviewed migration before this schema is released.

## Earlier `cruisin` index-run assessment

Configuration evidence indicates that an unoverridden server command would resolve `server/.env` to the remote Atlas cluster `cluster0.ospuazc.mongodb.net`, database `cruisin`; it was not the required isolated local database. The available evidence does not prove whether that Atlas database is development, staging or production, so it must be treated as potentially production-impacting.

The index script path used `model.createIndexes()` only. It contains no document update/delete, `dropDatabase`, `dropIndex`, or `syncIndexes()` operation. The expected effect was additive index creation only. There is no evidence that an existing index or document was dropped or changed. No database was altered during this investigation.

## Manual browser result

Full observations and screenshot references are in `SHIPROCKET_MANUAL_BROWSER_QA.md`.

Observed passes include:

- storefront catalogue, product/cart/login and serviceable quote;
- standard/express rate, ETA and total updates;
- 1440/1280/768/390 layouts with no horizontal overflow;
- customer order list, courier, AWB, ETA and deduplicated tracking timeline;
- admin navigation, KPI values, order/AWB search, status filtering and shipment actions;
- completed RTO, return and exchange states;
- customer in-app logistics notifications;
- anonymous admin denial.

Release blockers:

1. prepaid-only `110001` still allows the customer to select COD;
2. non-serviceable `999999` falls back to legacy rates and misleading “logistics disabled” copy;
3. a stale checkout error remains visible after a later valid quote;
4. payment/courier filters and pagination are absent on the logistics dashboard;
5. required shipping-collected, margin, COD/RTO/return/exchange cost metrics and analytics filters are absent;
6. missing costs display as zero instead of unavailable;
7. viewer/manager/admin browser accounts are absent, so the manual role matrix is blocked;
8. several manual transition/restart/outage checks were automated-only or not executed.

## Warnings

- `NO_COLOR` was ignored because Playwright set `FORCE_COLOR`: harmless test noise.
- Next.js warned that future versions require `allowedDevOrigins` for local cross-origin dev assets: configuration issue, not a current release blocker.
- Dependency deprecations from `npm ci`: maintenance issue; production audit is clean.
- Development API logs include stack/source paths for handled errors: production-observability issue; responses remained customer-safe in observed cases.
- Initial sandbox loopback/IPC failures: test-environment noise; privileged local reruns passed.

## Real provider and controlled-live stages

- Real Shiprocket read-only smoke: **not run**, because prior manual/index gates were not green.
- Live Shiprocket mutation: **not run**.
- Controlled disposable-order plan: retain manual provider order, manual courier, manual AWB, manual label/print preview, manual pickup, webhook verification and explicit cleanup; do not execute until a separate approval after all blockers close.

## Final checklist

| Gate | Result |
| --- | --- |
| Unit/integration minimum 204 | Pass: 259 |
| Focused logistics minimum 31 | Pass: 38 |
| Playwright 8 | Pass: 8 |
| Storefront/admin/server builds | Pass |
| Secret scan | Pass |
| Production dependency audit | Pass: 0 |
| Isolated index creation + 12 verification | **Fail** |
| Manual critical storefront/admin flows | **Fail** |
| Authorization manual matrix | **Blocked** |
| Payment-outage safety | Pass |
| Real read-only Shiprocket | **Not run by gate** |
| Deployment | None |
| Live mutation | None |

**Final recommendation: NO-GO.**
