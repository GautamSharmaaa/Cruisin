# Implementation progress

Updated 2026-11-05. Local V2 only, branch `codex/cruisin-v2`. Hosted staging remains stopped by user instruction. No push, production deployment, production database write, real payment/shipment or DNS/Cloudinary mutation was performed.

| Phase | Status | Verification |
|---|---|---|
| Isolation and recovery preservation | VERIFIED LOCALLY | Loopback Mongo27983/Redis6392, guarded launchers, existing encrypted backups unchanged |
| Shared design system and three themes | VERIFIED LOCALLY | Four app builds; theme/browser and keyboard tests |
| Employee provisioning, synthetic OTP, sessions, RBAC | VERIFIED LOCALLY | Real Mongo/Redis integration; revoked/expired/incorrect/CSRF/ownership cases; real Redis client interruption |
| Admin assignment, employee tasks, notifications and review | VERIFIED LOCALLY | Desktop/mobile cross-app task completion and refresh |
| Product and packaging SOPs | VERIFIED LOCALLY | Separate kinds, custom sections, ordered required steps, immutable versions, independent publication, measurements and acknowledgments |
| Physical receiving, QC, labels and packed stock | VERIFIED LOCALLY | Unsellable receipt, unique IDs, SVG QR decoding, reprints, evidence/scan/tolerance checks and concurrent packaging |
| Shared stock authority and ledger | VERIFIED LOCALLY | Checkout reserves exact units and variant availability transactionally; immutable ledger, approved counts and reconciliation |
| Fulfillment, package evidence and mock shipping | VERIFIED LOCALLY | Browser COD→automatic task→assignment→pick→measure/photo→mock AWB/label→handover; service test confirms carrier tracking→SHIPPED |
| Returns, exchanges and exceptions | VERIFIED LOCALLY at service/API level | Inspected return disposition, linked tracked replacement without second deduction, independent damage/rework approvals, owner assignment/resolution |
| Public/private media and migration | VERIFIED LOCALLY with local provider | File signatures, checksums, grants/revocation, mapping/dedup/resume/fallback; guarded R2 staging path prepared |
| Hardening and CI preparation | VERIFIED LOCALLY / remote CI NOT RUN | Regression, coverage, accessibility, source scan, audit, parsed CI; no push |
| Hosted staging and real providers/hardware | BLOCKED | Explicit approval, credentials/budget, provider account and physical device acceptance needed |

No attendance, shift tracking, location tracking or Fasterr implementation was added.

The full mandatory local business sequence is demonstrated by `employee/e2e/physical-workflow.spec.ts` and `server/src/services/physical-units.integration.test.ts`. Browser tests seed synthetic fixtures, use real APIs and persistence, and mock external logistics only at the existing provider boundary. Camera scanning hardware, printer output/DPI, scales, real SMS/R2/Shiprocket and hosted caching are NOT VERIFIED.

Remaining release work: approve and activate isolated hosting; choose evidence retention/purge policy before real-data onboarding; conduct a counted conversion for nonzero legacy inventory; run approved real provider and physical hardware acceptance; perform broader sustained load and manual accessibility/security review. Nonzero legacy stock is rejected by automatic unit conversion. These are deployment/cutover gates, not claims of completed external verification.

Strict TDD evidence applies to the added physical/fulfillment, publication, tolerance, day-boundary and review invariants. Earlier modules were implemented before the newer TDD brief and have characterization/regression evidence; they are not retroactively labeled test-first.

Final local follow-through: added scoped packing/dispatch/exception dashboard counts, recoverable summary errors/refresh and notification pagination/read access; retained the requested admin-matching employee design. Regression now totals 647 passing tests, with fresh measured server coverage and rebuilt local applications. See [verification evidence](../operations/VERIFICATION_EVIDENCE.md). Remaining external/cutover gates above are still unverified and were not activated.
