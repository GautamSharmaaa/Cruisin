# CRUISIN V2 CMS/storefront implementation report

2026-11-07. Status: **IN PROGRESS — first publication/preview slice**.

## Implemented

Extended the existing CMS rather than creating a parallel system. Public reads now respect an empty published snapshot, fail closed when its revision is missing, and reject draft-only pages. Invalid preview credentials and public schedule-time overrides return 403. Added a server-authorized saved-draft preview that uses the same CmsHomepage renderer, plus a link from the existing admin builder. Homepage rendering is dynamic to avoid its previous 60-second static revalidation window. Preview uses no-store/no-referrer/noindex protection.

The existing in-editor miniature preview remains separate and is not described as the final required live preview. Preview capability expiry/revocation and immediate unsaved-edit preview remain unfinished.

## Verification

Three genuine RED→GREEN database tests cover publication isolation. Full regression and the new real-backend browser test results are recorded below after completion. Existing catalog, stock, pricing, cart, checkout, media abstraction and operations services were retained. No product duplication, production mutation, remote push or deployment.

## Outstanding scope

The complete Men/Women editorial storefront has not been implemented in this slice. Shared runtime contracts/section registry; department model/backfill; editor redesign; optimistic concurrency; atomic releases and scheduling; shared navigation; editorial Home/Men/Women; catalog/search merchandising; PDP/quick-add/cart controls; supporting pages; media usage safeguards; SEO/redirects; analytics and the complete responsive/browser acceptance matrix remain required. Existing baseline features have not been relabeled as newly verified requirements.

See [phase and gap matrix](docs/cruisin-v2/cms-storefront/IMPLEMENTATION_PROGRESS.md) and the other 25 scoped documents for implementation boundaries. Live R2/CDN, real payments/shipping and hosted staging remain unverified; hosting stays stopped.

## A. Executive summary
Publication isolation and saved-preview connectivity implemented; full redesign in progress.
## B. Existing architecture reused
Existing CmsService, page/section/version models, CMS builder, CmsHomepage, Axios clients and commerce services.
## C. Admin CMS
Preview saved draft opens the real storefront renderer. Existing save/publish controls retained; new editor remains outstanding.
## D. Storefront
New authorized preview route and dynamic homepage delivery. Existing pages retained; editorial redesign outstanding.
## E. Men/Women
New department eligibility and presentation model not implemented. No inventory copies created.
## F. Connectivity
Saved sections load through the real CMS API and renderer; draft and published views remain separate.
## G. Publication and cache
Empty snapshots remain authoritative; invalid token/time overrides rejected. Preview no-store/no-referrer/noindex. Atomic releases, concurrency, scheduler and CDN propagation remain unfinished.
## H. Responsive QA
Browser desktop rendering and 375px page overflow verified. Full matrix/screenshots and real devices not verified.
## I. TDD
Three new behavioral failures reproduced before implementation, then all passed. Browser exposed and verified the fix for draft filtering in the shared renderer.
## J. Regression
515 server +90 storefront +45 admin =650 passing tests across 103 files. One new Chromium real-backend browser journey passes. Logs: /tmp/cruisin-cms-regression.log and /tmp/cruisin-cms-browser.log. Production builds and full acceptance matrix have not been rerun for this slice.
## K. Security
Existing server-side preview capability validation reused; invalid credentials rejected. Expiring/revocable preview credentials and full role/link/content validation remain required.
## L. Performance
No performance gain claimed. Dynamic home rendering favors publication freshness; cache optimization remains a later measured task.
## M. Media
Existing abstraction and legacy fallback retained. No asset migration or deletion performed.
## N. Outstanding work
See the scope list above and 26 implementation documents. The complete requested platform is not marked complete.
## O. Staging readiness
Not release-ready; hosted services remain stopped. Production and operations modules were not modified.
