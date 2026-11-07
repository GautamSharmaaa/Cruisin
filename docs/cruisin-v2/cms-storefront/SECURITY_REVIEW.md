# Security Review

Updated 2026-11-07. Status: **IN PROGRESS**.

Preview is a server-validated existing capability token, not a logged-in admin session. Tokens are not returned by public response sanitizers and query strings are redacted in API logs. Expiring/revocable preview capabilities, role-specific publishing, unsafe link/content validation and comprehensive API security tests remain required.
