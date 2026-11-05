# Package Weight Evidence

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Canonical units are kg/cm. Admin configures courier/service, positive divisor, expected min/max weight and evidence requirement. Package verification computes cm³ = length×width×height, volumetric kg = cm³/configured divisor, chargeable kg = max(actual,volumetric). It snapshots divisor/courier and never accepts a client-supplied universal divisor. Weight outside policy or missing photos fails. Private parcel evidence is readable by owner/admin or assigned-order employees; opaque grants expire and honor session revocation. Scale hardware and retention purge policy are NOT VERIFIED.

Detailed implementation record: [development/CLOUDFLARE_MEDIA.md](../development/CLOUDFLARE_MEDIA.md).
