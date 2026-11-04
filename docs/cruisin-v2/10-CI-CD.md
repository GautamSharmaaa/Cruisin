Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# CI and deployment safety

Latest observed GitHub CI run 37290674621 at main 4e51d77 failed: quality passed; browser E2E failed; Deployment gate failed. Production checkSuites=false was previously observed and was not changed. No remote CI rerun or push was performed.

V2 fixes align the CI MongoDB name with the existing test guard and preserve explicitly configured test ports/Redis. Synthetic test fixtures now use test key prefixes. Provider contracts keep mocked transports while testing simulated production behavior. Unit/integration tests pass locally.

CI now prepares a supplemental secret scan and npm audit --audit-level=high. A genuine Zod high-severity advisory remains, so the audit gate is expected to FAIL until a reviewed Zod 4 migration is complete. 15 moderate and 4 low advisories also remain. No force upgrade or automatic breaking migration was performed. Next is pinned consistently to 15.5.29, sharp to 0.35.5 and brace-expansion 1.x to 1.1.21 in V2. Npm 10 audit-fix hit an Arborist error; npm 11 performed compatible updates, followed by explicit override refresh and successful validation.

v2-staging-deploy.yml is intentionally disabled by V2_STAGING_ENABLED and an explicit failing activation step, even after successful CI. It checks the exact successful CI head and same repository. It is prepared gate scaffolding, not an operational deploy pipeline. Before activation pin reviewed deployment tooling, configure the staging-only token and protected GitHub environment, privately verify isolated resources, and replace the disabled step with deploys for the successful head SHA. Direct branch auto-deploy must require CI checks or remain disconnected.

railway/v2-main-protection.proposed.json is a reviewable proposed production protection payload. Applying it or changing production auto-deploy requires separate explicit approval. The full historical E2E/logistics suite and remote quality gate are NOT VERIFIED by the 12-case local smoke suite. The supplemental pattern scanner does not replace a full history credential scanner.
