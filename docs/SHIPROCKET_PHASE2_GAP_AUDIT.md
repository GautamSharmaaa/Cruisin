# Shiprocket Phase 2 Pre-Edit Gap Audit

Date: 2026-07-28

This is the required code-versus-report snapshot taken before Phase 2 implementation. It reflects the uncommitted Phase 1 worktree as reviewed, not intended future behavior.

Post-edit status is tracked separately in `SHIPROCKET_PHASE2_HARDENING.md` so this required pre-edit snapshot remains auditable.

| Status | Capability | Evidence and gap |
| --- | --- | --- |
| Implemented and tested | Provider-neutral Shiprocket/mock boundary, package/rate normalization, quote ownership/expiry, customer tracking ownership, webhook authentication/replay dedupe, basic provider order/AWB/pickup/tracking, NDR duplicate reattempt guard, and RTO receipt/inspection/once-only stock restoration | Covered by focused Vitest route/core tests and the documented Phase 1 local mock exercise. |
| Implemented but not fully tested | Shiprocket authentication cache/401 refresh/retry/response parsing, durable job recovery, document provider calls, analytics, most return/exchange transitions, and optional auto-create enqueue | Code exists, but the stable seeded Playwright scenario matrix and concurrency coverage do not. No account-specific live-read verification has run. |
| Partial | Label/invoice/manifest | Admin-only generation endpoints and stored provider URLs exist. Missing document expiry/refresh metadata, atomic pending-generation guard, secure browser retrieval/print flow, and browser coverage. |
| Partial | Automation | Independent flags exist and automatic provider-order creation can enqueue. Automatic AWB and pickup do not chain after successful earlier steps; COD is not independently gated from prepaid automation. |
| Partial | NDR | Status, queue, audit notes, duplicate reattempt blocking, and RTO acceptance exist. Customer communication and a provider-side NDR action adapter are absent. |
| Partial | Returns | Eligibility, idempotent request, reverse pickup, warehouse/QC gates, and refund-state handoff exist. The workflow does not execute Razorpay money movement and had no end-to-end browser scenario. |
| Partial | Exchanges | Replacement stock reservation, reverse pickup, QC, replacement shipment, and completion states exist. It does not create a separate replacement commerce order and had no end-to-end browser scenario. |
| Not implemented | Logistics notification event service | No shipment/return/exchange notification event model, semantic event dedupe, delivery-attempt audit, template mapping, or webhook/job notification dispatch exists. |
| Not implemented | Customer logistics channels | No shipment email templates, in-app logistics events, SMS adapter, WhatsApp logistics adapter, preference-aware channel dispatch, or failed-notification admin view exists. Existing email is order-confirmation only; Twilio is identity-OTP only. |
| Not implemented | Stable seeded Playwright logistics matrix | Prepaid settlement/outage, NDR, RTO, return, exchange, document, and automation scenarios are not present as deterministic Playwright tests. |
| Not implemented | Document print experience | The admin exposes one “Label” generation action only. There are no invoice/manifest actions in the control center, print-label browser flow, duplicate pending feedback, or explicit success state. |
| Account-dependent | Live Shiprocket compatibility | Authentication, pickup location, serviceability, rate units, courier IDs, document URL lifetime, webhook payload variants, and account permissions require a guarded read-only smoke after credentials are supplied. |

## Phase 2 priorities

1. Validate and remediate dependencies under Node 22.
2. Add notification events/channels/preferences/admin failure visibility with outbound sends disabled in tests.
3. Harden documents and implement the browser print flow.
4. Chain automation safely with separate COD control.
5. Add deterministic isolated Playwright coverage, index verification, and guarded read-only smoke validation.
