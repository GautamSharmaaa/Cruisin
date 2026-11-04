Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Production snapshot

Project `illustrious-surprise`: `875a58d0-7cf6-4cf4-a86f-41920b50b56d`; environment `production`: `72fead2f-aa8d-4012-bc6d-c51be7118d2e`; source branch main for all three applications.

| Service | Active deployment | Commit/image |
|---|---|---|
| Storefront | 7e8dda84-4427-4a0c-918e-006a2e499e1d | 8e72f8ddff6f752e1e9e77d009677a57b51ff2d9 |
| API | 25192a4d-6a56-4826-b6a9-a5cc5e6f8a94 | 4e51d77d89f8eda6ff3e04a3300967e9b042765d |
| Admin | 82d74bd2-0d98-468f-8a75-05f0491b3e7b | 8f27b9e5d76253f3e0e0079d3bad01d69a518c75 |
| Redis | 6048e26f-6dec-4171-91ce-3d3789dc7813 | redis:8.2.9 |

The initial/final deployment and domain snapshots match. HTTP 200: https://cruisin.co.in/, https://cruisin-api-production.up.railway.app/ready, https://cruisin-admin-production.up.railway.app/health. The initial Python HTTP probe failed local CA validation; verified curl probes subsequently passed with TLS validation enabled.

Production auto-deploy settings were exported encrypted and left unchanged. The previous CI run 37290674621 failed at browser E2E after quality passed. Branch-protection API access returned an unavailable response; no production protection change was applied.
