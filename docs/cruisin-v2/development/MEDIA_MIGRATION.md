# Media Migration

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: local synthetic migration VERIFIED LOCALLY; production cutover BLOCKED.

Cloudinary integrations were inspected in product/category/CMS/merchandising uploads, public image configuration and return evidence. Admin new uploads now use the shared media API; old upload signature endpoint fails read-only. Customer returns use private media storage with authorized evidence delivery. No Cloudinary asset was deleted or rewritten in V1.

`node scripts/v2.mjs media-inventory` walks explicit known collections, records exact reference path/source/privacy to a restricted local JSON report. `media-migrate <manifest>` accepts synthetic:true entries only, verifies real paths under `~/.local/share/cruisin-v2/migration-fixtures`, reads local original bytes, uploads through local adapter, verifies SHA256/length, records association and source mapping, deduplicates content and supports resume. Changed source bytes cannot overwrite a previously verified identity. Traversal/missing source failures are recorded. No network source copying is authorized in this local command.

Executed synthetic manifest: two source identities, one identical PNG, both VERIFIED, zero failures; rerun verifies the existing mapping with no duplicate asset. Local inventory found zero Cloudinary references in the synthetic DB. Reports: `~/.local/share/cruisin-v2/migration-fixtures/{migration-report,media-reference-inventory}.json` (private, untracked). This is not the production asset count.

Response resolver changes only whitelisted public URL fields that have a verified public mapping. It preserves metadata, ignores private/authenticated Cloudinary paths, and falls back to original read URLs for missing maps. It never blindly replaces strings in descriptions or mutates original documents. R2 bulk-copy execution and full production reference/cost/delivery report remain BLOCKED pending approved destinations/credentials and explicit migration approval.

Rollback: disable verified V2 mappings/provider configuration, keep Cloudinary fallback and original source records; never delete source media. Sealed production backups remain unchanged.
