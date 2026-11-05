# Staging Deployment

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: BLOCKED by explicit user choice: keep hosted services stopped.

The existing Railway V2 project contains four empty service shells. No services were activated, no domains/DNS changed, no hosted Mongo/Redis or R2 bucket was provisioned. Production releases, GitHub main and V1 Cloudinary remain untouched. All work is local on codex/cruisin-v2.

Before an approved hosted deployment: agree monthly budget; provision dedicated replica-set Mongo and Redis; choose isolated private domains and Origin/CSRF policy; inject new staging-only secrets; configure real/synthetic OTP policy; approve R2 distinct buckets/CORS/CDN; review role map, data retention, publication/exception policies and legacy unit conversion. Run index validation, full migration rehearsal and network/provider failure acceptance. Never reuse production payment credentials/customer evidence.

Deploy the reviewed V2 commit only after explicit authorization. Run production builds and isolated tests first, then authenticate and demonstrate all cross-app workflows, record actual deployment IDs and rollback points. Real provider and hardware acceptance remain separate from mock/local proof. Disable/rollback V2 without touching V1 or deleting backups.
