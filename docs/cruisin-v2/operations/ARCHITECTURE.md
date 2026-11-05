# Architecture

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/ARCHITECTURE.md](../development/ARCHITECTURE.md).

Status: IMPLEMENTED; local verification evidence is in TEST_RESULTS.md.

The storefront (`client`), existing admin (`admin`) and new employee (`employee`) are Next.js 15.5 applications. They share `packages/ui`, `packages/contracts` and `packages/operations-ui`. One Express application owns all operational and commerce truth. No employee database copy, new microservice or attendance subsystem exists.

Admin operations use `/api/v1/admin/operations`; employees use `/api/v1/employee`; media delivery is `/api/v1/media`. Express validates with Zod 4, derives principals server-side, checks permission and object scope, calls domain services, and persists in the same MongoDB. Redis supplies OTP cooldowns and migration locks. Mongo transactions atomically persist stock/domain updates and audit/notification records.

New domain models live in `server/src/models`: employee/session/OTP, employee-task, approval-request, stock-movement, SOP publication/acknowledgment, media, physical-unit/receipt/exception and fulfillment-record/courier-policy. Existing Product variants remain the commerce availability source. Tracked units reconcile against that count; legacy aggregate variants are explicitly distinguished.

Local ports: storefront3192, admin3193, employee3194, API8192, Mongo27983 (single-node `rsCruisinV2`), Redis6392. Only loopback bindings. Dev DB `cruisin-v2-local`; automated DB `cruisin-sync-order-analytics-tests`, Redis14. `scripts/v2.mjs` discards inherited provider exports. `v2-isolation.ts` rejects production targets and nonsynthetic provider settings.

Source packages are transpiled by Next, and all Tailwind configs include their classes relative to their own location. No unnecessary framework-major upgrade was made.
