# Employee Auth

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/EMPLOYEE_AUTHENTICATION.md](../development/EMPLOYEE_AUTHENTICATION.md).

Status: IMPLEMENTED and VERIFIED LOCALLY by operations.integration.test.ts and Playwright.

Only the existing authenticated admin interface provisions a system-generated employee identifier, registered phone, role, grants/denials and active state. Employee ID and sessions are separate from customer/admin JWT authentication. An employee cookie cannot authorize legacy commerce/admin endpoints.

The synthetic OTP provider is an adapter, rejects use outside development, stores only HMAC-protected challenges, expires in five minutes, permits five attempts, enforces a 60-second resend cooldown and per-phone abuse limits. Unknown/inactive responses are generic. Challenge consumption, session creation and audit recording are transactional. Session version plus phone identity invalidates outstanding challenges after revocation or phone changes.

Opaque session tokens are hashed in MongoDB, expire in 12 hours and are revocable individually or all at once. Cookies are HttpOnly, SameSite Strict, host-only, scoped to `/api/v1/employee`, and Secure outside local development. Every mutation requires an allowed browser Origin and matching session-bound CSRF header. Tokens are never put in audit records. Permissions and active state are reloaded on every request. Login/logout timestamps serve security auditing only.

Real SMS delivery is BLOCKED pending approved provider credentials and acceptance. No SMS was sent.
