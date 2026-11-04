Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Database and side-effect boundaries

Development/test MongoDB must use a mongodb:// loopback host and a database beginning cruisin- or cruisin_, excluding production names and the live database cruisin. Development Redis must use loopback. Staging requires explicit matching host allowlists and database cruisin-v2-staging; the known production MongoDB hostname is rejected by fingerprint. No real staging database exists, so a successful hosted staging connection is NOT VERIFIED.

The V2 launcher sanitizes inherited environment values. The original server/.env remains intact only in the old checkout and encrypted source backup. Fail-closed validation rejects live payment mode/keys, real Cloudinary/SendGrid provider credentials, Shiprocket live flags, messaging credentials and enabled dangerous jobs. Intentional false-configuration unit tests verify rejection without database connections. Browser configurations reject nonlocal automation targets.

Payment keys are synthetic, not genuine provider sandbox credentials. Notifications use APP_ENV rather than NODE_ENV so optimized staging builds cannot send customer email/SMS/WhatsApp. The durable processor starts only for a future approved production release. Staging/local webhook actions return 403; Fasterr adapter methods throw until configured. This policy must receive a security review before enabling real sandbox integrations or remote browser testing.

Existing provider adapter unit tests simulate live behavior with mocked transports and explicitly mock environment policy; they do not prove real provider connectivity. Production credentials were never injected into V2. Isolation is verified for these startup/configuration and local HTTP paths, not certified against a malicious operator changing source or deliberately bypassing guards.
