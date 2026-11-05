# CRUISIN V2 operations implementation report

Updated 2026-11-05. Branch: `codex/cruisin-v2`. Workspace: `/Users/gautam/Documents/Cruisin-V2` → `/Users/gautam/.codex/worktrees/cruisin-v2/Cruisin`.

## A. Executive summary

The local V2 platform now connects the existing storefront/admin and new employee portal to one guarded Express/MongoDB backend. Employee management, synthetic OTP sessions, permissions, reviewed tasks, product/packaging SOPs, physical units, QC, unique QR labels, authoritative stock, fulfillment, package evidence, mock shipping and exception/return workflows are implemented. The core admin→employee→commerce workflow has real database and desktop/mobile browser evidence.

Hosted staging remains stopped as requested. No remote push, production deployment/database change, live payment/shipment, real SMS/email, DNS change or Cloudinary deletion was performed. No attendance or Fasterr implementation was added. External providers/hardware have separate unverified acceptance gates below.

## B. Architecture

Three Next.js applications share `packages/ui`, `packages/contracts` and `packages/operations-ui`. One Express API owns both commerce and warehouse records. The employee portal has no separate inventory/order copy. Existing admin and customer identity are reused; employees have dedicated revocable opaque sessions.

Admin API: `/api/v1/admin/operations`; employee API: `/api/v1/employee`; media: `/api/v1/media`. Zod4 validates input; middleware derives the current principal; domain services authorize object access and execute transactions; Mongo persists domain/audit/notification records. Redis enforces OTP abuse limits and migration locks. Existing logistics outbox/provider integration is reused.

## C. Completed local features

- Shared Radix/shadcn-style controls and semantic light/dark/system themes across all apps.
- Admin employee creation/editing, granular grants/denials, activation and session revocation.
- Synthetic OTP adapter, one-use challenges, expiry/cooldown/attempt limits, secure cookies, CSRF/Origin checks and refresh-safe sessions.
- Assigned tasks, checklists/comments/evidence, dependencies, version checks, notifications, independent reviews and rework.
- Separate product/packaging SOP editors with custom sections, ordered mandatory/photo/scan steps, administrator measurement bounds, immutable publications and acknowledgments.
- Physical receiving, QC, quarantine/damaged dispositions, immutable unit identity, QR preview/reprint, configured print layout/calibration and manual/camera scan controls.
- Shared stock/ledger, approved aggregate corrections, exact unit reservation, order picking, parcel measurements/evidence, AWB/document association, explicit handover and carrier status reconciliation.
- Inspected returns, linked tracked exchange replacements, exception owner assignment/resolution and persisted operational summary counts.
- Local public/private media delivery, signed grants, checksum verification, guarded R2 adapter, resumable mapping/deduplication and read-only Cloudinary fallback.

## D. Admin/employee connectivity

`employee/e2e/operations.spec.ts` creates an employee and assigned task in admin, authenticates the employee by synthetic OTP, submits work, independently reviews it in admin and verifies completion after refresh. It also exercises SOP acknowledgment, an isolated stock correction, theme persistence, keyboard dialog control and route protection.

`employee/e2e/physical-workflow.spec.ts` uses actual local APIs and synthetic fixtures for published SOP review, receiving, employee QC/evidence, packaging/scan, storefront availability, customer COD reservation, automatic fulfillment task, assignment, picking, weight/photos, mock AWB/label, print preview and handover. The same record is visible in admin/employee and survives reload. Provider tracking is reconciled through the existing authorized logistics API.

## E. Inventory integrity

`Product.variants[].stock` remains the storefront availability source. Tracked receiving adds no available stock. PASSED QC and verified packaging add exactly one unit. Checkout transactionally reserves that stock and exact physical units. An allocation cannot belong to two orders, and shipping does not deduct stock a second time.

The ledger records immutable deltas and unit lifecycle events with actor/reference/state. Corrections require independent approval and current stock revision. Quantity-only edits to tracked stock are prohibited. Reconciliation compares packed available units to variant availability. Existing aggregate stock remains explicitly distinguished; nonzero legacy conversion requires a reviewed physical count rather than an automatic production migration.

Real transaction tests cover competing packaging/reservations, stale approvals, double restock, RTO/exchange concurrency, damage review and unit return inspection. Tracked exchanges link the same customer's already-reserved eligible replacement order without a duplicate deduction.

## F. QR tracking

Product, SKU, immutable physical unit, order, shipment and AWB are distinct identities. Backend receiving creates units; a label retrieves an existing identity. Reprints never create stock. Tests rasterize and decode the actual generated QR SVG and verify the original code. Manual scans reject unknown/wrong/duplicate/ineligible allocations. Browser preview/calibration and print controls are implemented. Physical camera, printer resolution/label adhesion and scanner performance remain NOT VERIFIED.

## G. SOP and QC workflows

Product and packaging publications require independent version-bound approval. Employees cannot publish their own changes. Draft changes preserve the last published employee view. Every QC/packaging record pins the publication used. The backend checks required steps, private evidence, unique-unit scan and configured measurement bounds; it never invents garment specifications. Failed/quarantined QC needs independent rework approval. Approved damage disposition removes sellable availability exactly once.

## H. Fulfillment and shipping

Eligible paid/COD/valid partial-payment orders get an idempotent task in the order transaction, with the existing outbox retaining recovery processing. Failed/cancelled orders are rejected. Employees see only assigned fulfillment product details.

Actual kg/cm values are persisted; volume, volumetric weight and chargeable estimate use the administrator's courier/service divisor. Missing/invalid measurements or evidence block packing. Shipping reuses existing LogisticsService/MockLogisticsProvider locally. A matching AWB and generated document verification identity are required before handover. PACKED, READY_FOR_HANDOVER, HANDED_OVER and carrier-confirmed SHIPPED remain separate. Mock documents have a printable local preview shared with existing admin behavior.

## I. Cloudflare/media migration

The real R2 adapter implements supported S3 operations and requires explicit remote approval configuration and separate public/private buckets. Migration accepts local synthetic manifests; a separately approved isolated staging path is prepared. No hosted R2 operation was executed.

The local migration CLI verified two source identities with identical content, deduplicated the stored object and verified a second run without duplicate upload. It preserves mapping/associations and validates size/SHA256. A public resolver maps exact verified media fields while preserving alt/metadata and retaining unmigrated Cloudinary reads. No blind source rewrite or source deletion occurs.

Cloudflare delivery origin is explicitly validated and allowed in image/CSP configuration. Local private video delivery is allowed only from the API; private grants honor ownership/assignment/review and revocation. Actual R2 credentials, bucket/CORS/CDN/caching/transformation correctness, production asset inventory/copy and hosted costs are NOT VERIFIED.

## J. TDD evidence

The expanded TDD brief arrived after the earlier auth/tasks/media implementation. Those earlier modules have characterization/regression evidence and are not retroactively described as test-first. Added unit/fulfillment, publication, tolerance, ledger, exchange/disposition and timezone behavior has genuine RED→GREEN evidence. Browser failures exposed missing submit types, nested scanner forms, completed-task read authorization and print/fixture assumptions; those issues were corrected.

See [TDD evidence](docs/cruisin-v2/operations/TDD_EVIDENCE.md) and [verification evidence](docs/cruisin-v2/operations/VERIFICATION_EVIDENCE.md).

## K. Regression and build results

The final regression run passed **510 server +90 storefront +45 admin =645 tests** in 102 test files. All four production builds and TypeScript checks pass. The built operations suite has six desktop/mobile cases; existing cross-browser smoke has 12 cases across Chromium, mobile Chromium, Firefox and WebKit. Final print-preview reruns and measured coverage are recorded in the linked evidence document.

No coverage percentage, hardware compatibility or remote CI result is inferred from mocks. A CI operations job is prepared, its YAML parsed locally, and the deployment gate includes it. No workflow was pushed or run remotely.

## L. Security

V2 guards reject production/remote local-development targets before connection. Launchers discard inherited provider settings. Employee sessions are hashed, revocable, expiring, HttpOnly/SameSite Strict with CSRF and Origin checks. Backend permissions/object scope protect tasks/orders/media, and self approval/stale versions fail. Real Redis connection interruption during OTP issuance fails closed without creating a challenge and recovers after reconnect.

Audit, stock movement and published SOP records reject updates/deletion through application hooks, including modifying persisted documents through save. This is not a database-administrator/WORM guarantee. Signed tokens are excluded from request logs. Upload signatures/types/size/path checks and private grants are enforced.

Zod migrated compatibly to4.6.7, including resolver/coercion/record and PATCH default behavior. Latest audit: **0 critical, 0 high, 6 moderate, 4 low**. Source secret scan: zero findings. Remaining advisories and incomplete coverage remain visible in verification evidence.

## M. Performance

A local sample received 500 synthetic units with receipt/ledger history in239ms and looked up one matching unit in8ms. This is a measured development-machine sample, not a hosted throughput/p95 guarantee. Lists paginate; allocation has variant/state/time indexes. Large-catalog reconciliation and sustained production-like load need separately measured staging acceptance.

## N. External dependencies

BLOCKED/NOT VERIFIED: hosted Railway services, real SMS, real R2/CDN, live Shiprocket/payments, camera hardware, printers and scales. Hosting budget/activation and any remote mutation require explicit user approval. No real customer evidence was uploaded to test storage.

## O. Remaining release work

Approve/activate isolated hosting and real-provider credentials; choose evidence retention/purge policy before real-data onboarding; perform a counted conversion of nonzero legacy stock; run real provider/hardware acceptance; conduct sustained hosted load and broader manual accessibility/security review. Automated accessibility checks cover serious/critical issues on the tested employee task screen in light/dark, not every legacy storefront page.

The local browser uses mock hardware/provider boundaries explicitly. Physical printing and real carrier acceptance cannot be certified from a headless browser. Synthetic local records remain for review; sealed backups and the original dirty V1 checkout remain unchanged.

## P. Local access and staging readiness

Current local applications: storefront http://127.0.0.1:3192, admin http://127.0.0.1:3193, employee http://127.0.0.1:3194, API readiness http://127.0.0.1:8192/ready. Existing synthetic admin: `admin@cruisin.local` / `CruisinAdmin123`. Synthetic storefront account: `customer@cruisin.local` / `CruisinCustomer123!` (email login at `/login?method=alternative`). Employee account: `+919000000002`, Local Operations Demo, Operations Manager; synthetic OTP is displayed on the local sign-in page after requesting a code. Additional employees can be provisioned in admin.

Use Node22 (local toolchain under `/Users/gautam/.local/share/cruisin-tools/node-v22.23.1-darwin-arm64/bin`) and `scripts/v2.mjs` for guarded starts/tests/builds. See [architecture](docs/cruisin-v2/development/ARCHITECTURE.md), [staging readiness](docs/cruisin-v2/operations/STAGING_READINESS.md) and [progress](docs/cruisin-v2/operations/IMPLEMENTATION_PROGRESS.md). Hosted staging remains stopped. V1 storefront/API/admin read-only probes returned HTTP200 during final verification.
