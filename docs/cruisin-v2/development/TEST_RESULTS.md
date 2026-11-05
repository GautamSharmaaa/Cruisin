# Test Results

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: ongoing final verification; exact final results are maintained in operations/E2E_VERIFICATION.md and the root implementation report.

Baseline: 443 server, 90 storefront, 45 admin =578 passing tests. Before the expanded brief, 480 server +90+45 =615 passed. Expanded unit/QC/fulfillment tests use real isolated MongoDB transactions and Redis; external shipment calls use the documented MockLogisticsProvider, not a mocked domain service.

`operations.integration.test.ts` covers employee OTP/session/CSRF/RBAC, admin assignment, wrong-owner denials, transitions/rework/approvals/concurrency, ledger/returns/RTO/exchange, SOP snapshots and role access, private evidence, migration resume/dedup/fallback. `physical-units.integration.test.ts` covers receiving, stock unavailable before QC, immutable IDs/reprints, mandatory evidence/scans, concurrent packaging, actual checkout stock reservation, parcel measurements, matching AWB/label, mock provider tracking, inspected returns and 500-unit measurement.

Browser suite: employee/e2e operations tests exercise desktop/mobile admin→employee tasks, SOP/ack, stock correction, reload, themes and keyboard Dialog Escape. Physical workflow suite adds actual browser QC/packaging and customer COD→fulfillment; see final results before calling it verified. Existing cross-browser storefront/admin smoke must pass after the final build.

Commands use Node22 and `scripts/v2.mjs {typecheck,lint,test,build,e2e,operations-e2e}`. Builds include all four applications. CI is prepared for isolated Mongo8 replica set/Redis; no remote run or push was performed. No coverage percentage is claimed without a coverage run. Camera, physical printer/scale, live R2/SMS/Shiprocket/payments and staging are NOT VERIFIED.
