# Admin Final Remaining Manual Browser QA Report

Date: 2026-07-08  
Environment: local dev stack, Mongo Docker container, API `:8000`, storefront `:3000`, admin `:3001`  
Final result: FAIL

This is not an overall PASS. Part A testability/accessibility blockers were fixed and verified, but the full remaining manual browser QA matrix was not completed end to end.

## Executive Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Part A blocker fixes | PASS | CMS block buttons, CMS section actions, Storefront Manager row actions, Users row controls, Orders row controls, and malformed JSON behavior were fixed. |
| Gates after fixes | PASS | `npm run typecheck`, `npm run lint`, and `npm run build` all passed. |
| Clean local stack | PASS | Mongo running, seed completed, API health returned healthy, admin login and storefront returned HTTP 200. |
| Malformed JSON auth error | PASS | `POST /api/v1/auth/login` with malformed JSON returned `400` and `Malformed JSON request body`. |
| Live browser accessibility verification | PASS | Browser verified unique CMS `Add/Preview` buttons and unique Users/Orders row labels. |
| Full CMS manual matrix | FAIL | Began a real browser add/fill/save probe for Announcement Bar; draft was created and verified hidden from storefront. Publish/delete sequence was interrupted by browser confirm/reset, so the 20-block matrix was not completed. |
| Storefront Manager full tab/button QA | FAIL | Not completed after blocker fixes. |
| Discounts full coupon matrix | FAIL | Not completed after blocker fixes. |
| Categories full CRUD | FAIL | Not completed in this pass. |
| Catalogue import/export | FAIL | Not completed in this pass. |
| Orders lifecycle | FAIL | Not completed in this pass. |
| Users safe mutation | FAIL | Not completed in this pass. |
| Analytics live delta | FAIL | Not completed in this pass. |
| Responsive matrix | FAIL | Not completed in this pass. |
| Security matrix | PARTIAL | Malformed JSON and no-auth API checks were verified; full security matrix was not completed. |
| Cleanup | PASS | QA/final/manual test records were removed; final matching counts were zero. |

## What Was Fixed Before Testing

| File | Fix |
| --- | --- |
| `admin/components/cms/cms-builder.tsx` | Added stable `data-testid` and unique accessible names for CMS block library buttons, including slash-normalized names such as `Add Lookbook Editorial Story`. |
| `admin/components/cms/cms-builder.tsx` | Added title-scoped CMS section actions: `Edit section: [title]`, `Duplicate section: [title]`, `Toggle visibility section: [title]`, `Preview section: [title]`, `Delete section: [title]`. |
| `admin/components/storefront/storefront-manager.tsx` | Made shared row actions item-specific: `Edit [item]`, `Hide [item]`, `Show [item]`, `Delete [item]`; also made mega-menu column/link/card actions item-specific. |
| `admin/components/dashboard/user-manager.tsx` | Made user row controls unique: `Role for [email]`, `Active status for [email]`, `Update user [email]`, `View customer details [email]`. |
| `admin/components/dashboard/order-manager.tsx` | Made order row controls unique: `Status for order [id]`, `Tracking for order [id]`, `Admin note for order [id]`, `Update order [id]`, `Details for order [id]`. |
| `server/src/middleware/error.middleware.ts` | Converted body-parser JSON syntax errors into operational `400 Bad Request` responses. |

## Regression Gates

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |

## Exact Browser Actions Performed

| Action | Result |
| --- | --- |
| Opened admin login in live browser | PASS |
| Filled admin email/password | PASS |
| Clicked `Enter Dashboard` | PASS |
| Opened `/cms`, `/users`, `/orders` | PASS |
| Counted CMS unique block buttons by role/name | PASS |
| Counted title-scoped CMS section actions | PASS |
| Counted unique Users row labels/buttons | PASS |
| Counted unique Orders row labels/buttons | PASS |
| Clicked `Add Announcement Bar` | PASS |
| Filled Announcement Bar title/subtitle/description/text/link | PASS |
| Clicked `Save Draft` | PASS |
| Verified draft not visible on storefront/API home | PASS |
| Attempted browser delete cleanup | FAIL; browser confirm/reset interrupted the flow |
| Cleaned leftover probe data directly in Mongo | PASS |

## CMS Every-Block Matrix

| Block | Add/fill/save | Draft hidden | Publish/storefront | Edit/duplicate/hide/show/device/restore/cleanup | Result |
| --- | --- | --- | --- | --- | --- |
| Announcement Bar | PASS | PASS | FAIL | FAIL | FAIL |
| Hero Campaign | Not completed | Not completed | Not completed | Not completed | FAIL |
| Limited Drop Timer / Countdown | Not completed | Not completed | Not completed | Not completed | FAIL |
| Hot Drop | Not completed | Not completed | Not completed | Not completed | FAIL |
| Product Carousel | Not completed | Not completed | Not completed | Not completed | FAIL |
| Lookbook / Editorial Story | Not completed | Not completed | Not completed | Not completed | FAIL |
| Newsletter Section | Not completed | Not completed | Not completed | Not completed | FAIL |
| Trending Now | Not completed | Not completed | Not completed | Not completed | FAIL |
| Image Carousel | Not completed | Not completed | Not completed | Not completed | FAIL |
| Discount Banner | Not completed | Not completed | Not completed | Not completed | FAIL |
| Featured Collection / Collection Banner | Not completed | Not completed | Not completed | Not completed | FAIL |
| Single Video Landing | Not completed | Not completed | Not completed | Not completed | FAIL |
| Popup Campaign | Not completed | Not completed | Not completed | Not completed | FAIL |
| Brand Story | Not completed | Not completed | Not completed | Not completed | FAIL |
| Shop The Look | Not completed | Not completed | Not completed | Not completed | FAIL |
| Social Proof | Not completed | Not completed | Not completed | Not completed | FAIL |
| Best Sellers | Not completed | Not completed | Not completed | Not completed | FAIL |
| Marquee Strip | Not completed | Not completed | Not completed | Not completed | FAIL |
| Recently Viewed Products | Not completed | Not completed | Not completed | Not completed | FAIL |
| Fullscreen Collection Landing | Not completed | Not completed | Not completed | Not completed | FAIL |

## Storefront Manager Every-Tab/Button Matrix

| Tab | Result |
| --- | --- |
| Navigation | FAIL: not completed after fixes |
| Mega Menu | FAIL: not completed after fixes |
| Collections | FAIL: not completed after fixes |
| Filters | FAIL: not completed after fixes |
| Pages | FAIL: not completed after fixes |
| Settings | FAIL: not completed after fixes |

## Discounts Coupon Matrix

| Coupon scenario | Result |
| --- | --- |
| Percentage all products | FAIL: not completed |
| Fixed amount | FAIL: not completed |
| Free shipping | FAIL: not completed |
| Product-specific | FAIL: not completed |
| Category-specific | FAIL: not completed |
| Collection-specific | FAIL: not completed |
| High minimum cart | FAIL: not completed |
| Percentage with max cap | FAIL: not completed |
| Expired coupon | FAIL: not completed |
| Inactive coupon | FAIL: not completed |

## Category CRUD Matrix

Result: FAIL. Full create/edit/hide/show/archive/storefront/menu/filter verification was not completed in this pass.

## Catalogue Import/Export Matrix

Result: FAIL. Browser generate/download/upload/preview/map/validate/dry-run/confirm/history checks were not completed in this pass.

## Orders Lifecycle Matrix

Result: FAIL. Safe QA order creation and Pending -> Processing -> Shipped -> Delivered browser lifecycle was not completed in this pass.

## Users Safe Mutation Matrix

Result: FAIL. Safe QA user role/status mutation and last-superadmin protection checks were not completed in this pass.

## Analytics Live Delta Matrix

Result: FAIL. Controlled QA order/coupon analytics delta was not completed in this pass.

## Responsive Matrix

Result: FAIL. The requested admin and storefront responsive matrix was not completed in this pass.

## Security Matrix

| Check | Result |
| --- | --- |
| Malformed JSON returns 400 | PASS |
| Logged-out admin API returns 401 | PASS from previous smoke; not rerun fully here |
| Full role/access/hidden product/XSS/destructive-action suite | FAIL: not completed |

## Bugs Found/Fixed

| Bug | Status |
| --- | --- |
| Malformed JSON returned 500 | FIXED and verified as 400 |
| Ambiguous CMS block buttons | FIXED and browser-verified |
| Ambiguous CMS section actions | FIXED and browser-verified |
| Ambiguous Storefront Manager row actions | FIXED |
| Ambiguous Users row controls | FIXED and browser-verified |
| Ambiguous Orders row controls | FIXED and browser-verified |

## Cleanup Confirmation

QA/final/manual artifact cleanup:

```json
{"deletions":{"cmssections":0,"products":0,"categories":0,"coupons":0,"collections":1,"tags":0,"navigationitems":0,"newslettersubscribers":0},"remaining":{"cmssections":0,"products":0,"categories":0,"coupons":0,"collections":0,"tags":0,"navigationitems":0,"newslettersubscribers":0}}
```

## Final Checklist

| Requirement | Status |
| --- | --- |
| Fix admin UI testability/accessibility blockers first | PASS |
| Run typecheck/lint/build | PASS |
| Start clean local stack | PASS |
| Use live browser | PASS |
| Complete full remaining manual browser QA | FAIL |
| Mark overall PASS only if genuinely completed | PASS: overall is not marked PASS |

Final status: FAIL. The blocker fixes are complete and verified, but the requested full remaining manual browser QA still needs to be executed end to end before this project can receive an overall PASS.
