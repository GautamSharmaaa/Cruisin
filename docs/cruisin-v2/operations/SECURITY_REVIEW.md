# Security Review

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Local target guards execute before DB/provider initialization. Sandbox scripts remove inherited credential exports. Employee cookies/CSRF/Origin/revocation are server-authoritative. Admin account control checks active existing UserModel identity. New schemas reject unknown fields; explicit permission checks protect each mutation. Idempotency/CAS/transactions protect inventory. Sensitive media remains private with reference-based authorization and short-lived opaque grants; request logs omit signed tokens. File signatures/size/path checks reject malicious input. Audit/ledger/publications have append-only application hooks; DB administrator privilege remains a separate operational concern. No immutable database/WORM claim is made. No customer data or production evidence is used in test DB. Dependency audit and source scan results are recorded separately. Retention/purge and full manual penetration/WCAG tests remain deployment gates.

Detailed implementation record: [development/ROLE_PERMISSIONS.md](../development/ROLE_PERMISSIONS.md).
