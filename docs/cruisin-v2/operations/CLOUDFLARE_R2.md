# Cloudflare R2

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/CLOUDFLARE_MEDIA.md](../development/CLOUDFLARE_MEDIA.md).

Status: local adapter VERIFIED LOCALLY; real R2 adapter IMPLEMENTED, remote integration BLOCKED.

StorageProvider implements upload, get, head, delete, signed upload and metadata. Local files live outside Git in restricted directories, use opaque keys and file signature/size validation. Upload checks stored size and SHA256. Public media is served by API in local mode. Private evidence uses an authenticated short-lived opaque grant; expired/revoked sessions cannot continue using it. Image/video previews render inline; other documents download. Soft-deletion refuses referenced evidence/publications.

R2StorageProvider uses AWS S3 v3 with region auto and a validated R2 endpoint, distinct public/private buckets, head metadata and presigned operations. It refuses remote work unless `CRUISIN_R2_REMOTE_APPROVED=true` is explicitly configured after approval. No R2 remote request was issued. Secrets stay server-only. Private delivery remains controlled rather than publishing a private bucket.

Public mapped assets may use a configured HTTPS delivery origin. Supported transformation widths are 320/640/960/1280/1920 and format auto; actual Cloudflare caching/transform availability requires hosted verification. Next image allowlists/CSP include local API media and approved configured delivery hosts. Cloudinary remains read-only fallback for unmigrated references. Existing alt/image metadata is preserved.

Official references reviewed: [R2 AWS SDK v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [image transformations](https://developers.cloudflare.com/images/optimization/features/). Storage, requests and transformations have no measured hosted costs here; authorize a budget before activation.
