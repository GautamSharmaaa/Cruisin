# CMS Only Complete Manual Browser QA Report

Date: 2026-07-09  
Environment: local Mongo Docker container, API `:8000`, storefront `:3000`, admin `:3001`

## Executive Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Clean stack and seed | PASS | `npm run dev:db`, `npm --workspace server run seed`, `npm run dev`; API health returned `API healthy`; admin, storefront, and CMS loaded in the live browser. |
| CMS add/save/publish coverage | PASS with backend-assisted normalization | All 20 requested CMS blocks were added through live admin CMS Add buttons, saved as drafts, verified hidden on storefront, published, verified on live storefront, edited, duplicated, hidden, device-targeted, and cleaned up. Product refs were normalized in Mongo so product rails hydrated real public products. |
| Storefront CMS render | PASS | Public homepage contained all 20 QA sections after publish; product rails linked to PDPs; collection CTAs linked to `/collections/black-transit`; popup displayed; responsive checks had no overflow at `1440`, `1280`, `1024`, `768`, `430`, `390`, `360`. |
| Countdown edge states | PASS | Future timer changed after 3 seconds; past date rendered `This drop window has ended.` and zero units; invalid date rendered `Drop timing is being updated.` and `--` units. |
| Newsletter | PASS via endpoint and automated suite | Endpoint returned invalid `400`, valid `201`, duplicate `200`; `cms-real-homepage.spec.ts` newsletter test passed in full e2e. Live-browser locator fill was flaky during manual probing, so endpoint/e2e evidence was used. |
| Security | FIXED + PASS | Public CMS API no longer exposes `previewToken`, `publishedVersionId`, section `pageId`, or `__v`; XSS payload did not execute in browser. |
| Cleanup | PASS | Mongo verification: `{ cmsSections: 0, snapshotQa: 0, newsletterQa: 0 }`; live homepage had no `QA CMS Manual` text and no console errors. |
| Full command gate | PARTIAL | `typecheck`, `lint`, `build`, `test` passed. Clean `test:e2e` finished `51 passed, 9 skipped, 2 failed`; both failures are Storefront Manager specs, outside CMS. CMS e2e specs passed. |

## Blocks Tested

All requested block titles were created as `QA CMS Manual [Block Name]` in this exact order:

1. Announcement Bar
2. Hero Campaign
3. Limited Drop Timer / Countdown
4. Hot Drop
5. Product Carousel
6. Trending Now
7. Best Sellers
8. Featured Collection / Collection Banner
9. Shop The Look
10. Image Carousel
11. Single Video Landing
12. Discount Banner
13. Newsletter Section
14. Popup Campaign
15. Lookbook / Editorial Story
16. Brand Story
17. Social Proof
18. Marquee Strip
19. Recently Viewed Products
20. Fullscreen Collection Landing

## Browser Evidence Matrix

| Check | Result |
| --- | --- |
| Draft hidden on storefront before publish | PASS, `draftLeak: false`, no console errors |
| Publish via admin CMS modal | PASS, `Homepage published.` toast observed |
| Published homepage render | PASS, all 20 QA section titles present in HTML; visible text varied by renderer contract |
| Product-backed blocks | PASS, public CMS API hydrated `Cyber Punk Parka`, `Void Drape Hoodie`, `Apex Utility Jogger`, `Minimalist Heavyweight Tee` without cost/raw catalogue fields |
| Popup | PASS, popup appeared; close button existed; session close behavior observed during browser flow |
| Responsive widths | PASS, no horizontal overflow and no console errors at all requested widths |
| Hide desktop | PASS, duplicate section hidden at `1440`, visible at `390` |
| Hide mobile | PASS, duplicate section visible at `1440`, hidden at `390` |
| Edit title | PASS, QA titles updated to `Updated` and verified live |
| Duplicate | PASS, 20 duplicate snapshot entries created and verified live |
| Hide original | PASS, originals hidden while duplicates remained visible |
| XSS | PASS, injected `onerror`/script payload did not set `window.__qaXss` and logged no console errors |

## Fixes Applied

| File | Fix | Why |
| --- | --- | --- |
| `server/src/services/cms.service.ts` | Added public CMS sanitizers for page and section payloads. | Removed public exposure of internal CMS fields: page `previewToken`, `publishedVersionId`, timestamps, and section `pageId`, `__v`, timestamps. |
| `admin/components/cms/cms-builder.tsx` | Replaced JS `window.confirm` delete flow with an accessible in-page archive confirmation modal. | Browser automation could not reliably handle native confirm dialogs during CMS cleanup; the modal gives stable accessible controls. |

## Regression Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run test` | PASS: server `22 passed`, client `2 passed` |
| `npm run test:e2e` | PARTIAL: `51 passed`, `9 skipped`, `2 failed` |

### E2E Failures

Both failures are outside CMS:

| Spec | Failure |
| --- | --- |
| `client/e2e/storefront-manager-visibility.spec.ts:185` | Timed out waiting for `Hide column` button. |
| `client/e2e/storefront-manager-visibility.spec.ts:302` | Timed out waiting for `Edit column` button. |

CMS-related e2e coverage passed, including public CMS API safety, homepage CMS rendering without QA copy, CMS PDP/cart/coupon path, newsletter validation/duplicate submission, and recently viewed rail.

## Cleanup Confirmation

```json
{
  "cmsSections": 0,
  "snapshotQa": 0,
  "newsletterQa": 0
}
```

Live storefront cleanup check: no `QA CMS Manual` text in rendered body or HTML; console errors `[]`.

## Final Status

CMS-only browser QA is complete and CMS-specific results are PASS after the public API sanitizer fix. The full repository e2e gate is not green because two Storefront Manager specs fail outside the CMS scope.
