# Shiprocket Phase 2 Hardening

Date: 2026-07-28

This is the post-edit status. The required pre-edit snapshot remains in `SHIPROCKET_PHASE2_GAP_AUDIT.md`.

## Feature-versus-code status

| Status | Capability | Current evidence and remaining boundary |
| --- | --- | --- |
| Implemented and unit-tested | Provider/mock contract, normalized rates/status, package calculations, one-shot retry fixture, independent prepaid/COD create flags, AWB/pickup prerequisites and dedupe, all 18 notification templates, four-channel dispatch/preferences/failure sanitation, webhook dedupe/security, NDR duplicate reattempt, and RTO once-only inventory restoration | Focused pure logistics tests pass under Node 22. Socket-based route suites passed before the final Phase 2 edits but could not be rerun afterward because local socket approval was unavailable. |
| Implemented; deterministic Playwright runtime pending | Real mock quote/checkout/signed Razorpay settlement/provider job/AWB/pickup/tracking/delivery; provider outage and worker retry; NDR; RTO; return; exchange; document APIs; admin document/print UI | `client/e2e/logistics-matrix.spec.ts` and `logistics-documents.spec.ts` use a guarded exact-name local database and mock providers with no internet. They typecheck and are wired into CI. The local run was blocked before tests started by the execution sandbox’s local-socket restriction and exhausted approval allowance. No green Playwright result is claimed. |
| Implemented and access-controlled | Label, invoice, and manifest generation; atomic pending guard; temporary URL expiry/refresh; secure admin metadata; customer denial; loading/success/failure UI; browser Print Label flow | Direct physical/thermal printing is not implemented. It requires a separate local print agent. |
| Implemented, disabled by default | Email, SMS, and WhatsApp logistics adapters | Dispatch and preference behavior is unit-tested with provider calls mocked. Actual delivery is not verified. Production enablement remains dependent on SendGrid/Twilio sender, policy, recipient consent, and delivery validation. |
| Implemented when notifications are enabled | In-app logistics notifications and failed/partial event visibility | Uses the existing Notification model and admin logistics failure view. Semantic event dedupe prevents webhook/job replay sends. |
| Account-dependent | Live authentication, exact pickup record, route serviceability, account courier/COD fields, document response shapes/lifetimes, webhook variants, and permissions | The hardened read-only smoke is prepared but was not run because no live credentials were supplied. |
| Intentionally not implemented | Automatic physical label printing; local print agent; provider-side NDR address mutation; automatic Razorpay refund execution from the return queue | Browser printing, audited NDR operational notes, and refund-state handoff are the implemented boundaries. |

## Node 22 verification record

Runtime: Node `v22.23.1`, npm `10.9.8`.

| Command/check | Result |
| --- | --- |
| `npm ci` | Passed under Node 22 after dependency remediation. The final repetition stalled on sandbox-restricted registry access and could not receive escalated network permission; it was stopped without a reported install error. |
| `npm run lint` | Passed in all three workspaces on the final tree. |
| `npm run typecheck` | Passed in all three workspaces on the final tree. |
| Tests | 204 unit/integration tests are defined: server 147, client 37, admin 20. In the final restricted run, 166 passed and 38 existing Supertest route tests were environment-blocked by `listen EPERM`; no assertion failure preceded that socket error. The new pure Phase 2 logistics subset passed 24/24. |
| `npm run build` | Passed: storefront Next.js build, admin Next.js build, and server TypeScript build. |
| `npm run verify:logistics` | Lint and typecheck passed, then the same Supertest socket restriction stopped the test stage. Later build and secret-scan stages were run separately and passed. |
| `npm audit --omit=dev` | The exact post-upgrade audit returned `found 0 vulnerabilities`. The final repeat was unable to resolve the npm registry in the sandbox; the dependency tree and lockfile did not change afterward. |
| Logistics Playwright | Eight tests are defined across prepaid/outage/NDR/RTO/return/exchange and document UI flows. The local runner could not start its test servers because local socket permission was unavailable, so no pass result is claimed. |
| Webhook replay | Pure replay fixture passed; the identical payload was accepted once and deduplicated before a second notification. |
| Frontend secret scan | Passed across 205 built static files. |
| Critical index contract | Pure schema verification passed for all 12 required indexes. The exact production index command targeted only `cruisin-logistics-indexes`, but localhost MongoDB access was blocked by `connect EPERM`; no database index result is claimed. |

## Notification events

The durable notification event model covers:

`shipment_created`, `awb_assigned`, `pickup_scheduled`, `picked_up`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `ndr`, `reattempt_requested`, `rto_initiated`, `rto_delivered`, `return_approved`, `return_pickup_scheduled`, `return_received`, `exchange_approved`, `replacement_shipped`, and `exchange_completed`.

Every delivery record includes channel, template, recipient, status, attempt count, timestamps, and sanitized failure. Notification processing is non-fatal to fulfilment.

## Dependency remediation

Smallest safe compatible versions selected:

| Dependency | Final version | Reason |
| --- | --- | --- |
| Next.js / `eslint-config-next` | 15.5.21 | Patched the affected Next 15 line without a major framework migration. |
| PostCSS | 8.5.18 | Patched the parser advisory in the existing major line. |
| sharp | 0.35.0 | Patched vulnerable transitive image-processing versions through a root override. |
| Mongoose | 8.24.1 | Patched the advisory without moving to Mongoose 9. |

No `npm audit fix --force`, suppression, or ignored advisory was used. The lockfile is preserved.

## Deterministic local matrix

The seed command refuses to run unless:

- `LOGISTICS_E2E_SEED=true`;
- the database is exactly `cruisin-logistics-e2e`;
- the host is `localhost` or `127.0.0.1`;
- Shiprocket mode is `mock`;
- both live permissions are false.

Only after all checks pass does it drop and reseed that exact isolated database. Fixtures use fake `example.test` recipients. External notification sends remain suppressed.

Run with Node 22 and local MongoDB/Redis:

```bash
npm run test:e2e:logistics
```

## Activation recommendation

Do not activate live mutations yet. First obtain a green final Node 22 suite and isolated Playwright/index run, supply the intended Shiprocket account credentials manually, run the confirmed read-only smoke, verify pickup/courier/COD/document behavior, configure the HTTPS webhook, and validate alerting. Then activate in stages: live-readonly, manual create, manual AWB/pickup/documents, worker reconciliation, optional auto-create. Keep automatic AWB and pickup off initially. Keep SMS/WhatsApp/email logistics channels off until their real sender and consent checks pass.

No deployment and no live Shiprocket mutation were performed.
