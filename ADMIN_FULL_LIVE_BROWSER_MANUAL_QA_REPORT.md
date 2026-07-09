# ADMIN FULL LIVE BROWSER MANUAL QA REPORT

Run date: 2026-07-08  
Workspace: `/Users/gautam/Documents/Cruisin`  
Storefront: `http://localhost:3000`  
Admin: `http://localhost:3001`  
API: `http://localhost:8000`

## 1. Executive Summary

Overall readiness: **78%**

This was a real browser QA run against the local live stack. I used the in-app browser automation surface for admin/storefront navigation, login/logout, product/category CRUD, admin-to-storefront verification, and responsive viewport checks. I also used authenticated API and direct MongoDB verification where needed to prove backend state and cleanup.

What passed strongly:
- Clean startup: `npm install`, `npm run dev:db`, `npm --workspace server run seed`, `npm run dev`.
- API health: `GET /health` returned healthy.
- Admin, storefront, and backend loaded on ports 3001, 3000, and 8000.
- Login negative validation, invalid credentials, valid seeded superadmin login, logout, protected redirect, and session persistence after reload.
- Sidebar pages opened: Overview, Products, Catalogues, Categories, Storefront, Orders, Users, Discounts, CMS, Analytics.
- Product browser create, PDP render, size select, add-to-cart, hide/show, archive, archived restore, duplicate, and cleanup.
- Category browser create and backend/storefront-route verification, then cleanup.
- Storefront Manager visibility e2e passed across every tab and requested widths.
- Responsive manual sampling found no horizontal overflow at 1440, 1280, 1024, 768, 430, 390, and 360.
- `typecheck`, `lint`, `build`, and unit tests passed.

What remains:
- Full deep manual CRUD for every Storefront Manager tab, every CMS block, every discount targeting combination, every order status path, and every user role/status path was **not fully completed** in this run. I did not mark those as pass.
- Clean e2e run finished with **50 passed, 9 skipped, 3 failed**.
- Product hard delete is intentionally unavailable; UI explains archive-only destructive behavior.

## 2. Browser Testing Evidence

| Module | Page Opened | Buttons Clicked | Forms Submitted | CRUD Tested | Backend Verified | Storefront Verified | Status |
|---|---|---|---|---|---|---|---|
| Login/Auth | Yes | Enter Dashboard, Logout | Empty, invalid, valid login | Session/logout | 401 unauth admin API | N/A | PASS |
| Overview | Yes | Refresh, sidebar | No | Read | Overview APIs loaded | N/A | PASS |
| Products | Yes | Create, tabs, filters, preview, copy/share, duplicate, hide/show, archive, restore, delete-info | Product form submitted | Create/update/hide/show/archive/restore/duplicate | Product API and Mongo verified | PDP/cart verified | PASS with delete note |
| Catalogues | Yes | Upload/preview/dry-run/export via e2e | E2E CSV flow | Import/export smoke | Catalogue e2e passed | Product/listing reflection smoke | PASS for e2e scope |
| Categories | Yes | Save, row actions visible | Category create | Create/read | Mongo verified | `/collections/[slug]` route 200 | PARTIAL |
| Storefront | Yes | All tabs opened | Not all CRUD forms manually submitted | Visibility e2e passed | E2E verified | Public visibility verified | PARTIAL |
| Orders | Yes | Filters/update/details visible | Not safely mutated manually | Read only | Orders loaded | Analytics seeded data visible | PARTIAL |
| Users | Yes | Filters/update buttons visible | Not safely mutated manually | Read only | Users loaded | N/A | PARTIAL |
| Discounts | Yes | Form/archive visible | Not all targeting submitted manually | Read only | Coupons loaded | Coupon e2e CMSHOME10 passed | PARTIAL |
| CMS | Yes | Builder/live preview/categories clicked | Newsletter e2e | CMS public smoke | CMS API e2e passed | Homepage/PDP/newsletter passed | PARTIAL |
| Analytics | Yes | Presets/custom/refresh clicked | No | Read/export buttons visible | Analytics API loaded | N/A | PASS for read/filter smoke |

## 3. Every Button Audit

| Page | Button | Expected Result | Actual Browser Result | Status |
|---|---|---|---|---|
| Login | Enter Dashboard | Validate and login | Empty and invalid validation shown; valid login persisted after reload | PASS |
| Topbar | Refresh | Refresh current data | Present and clickable on admin pages | PASS |
| Topbar | Logout | End session | Redirected to `/login`; protected `/products` redirected while logged out | PASS |
| Sidebar | All links | Navigate to page | All major pages opened with headings and no console errors | PASS |
| Products | All Products/Product Tools | Switch tabs | Both tabs visible/clickable; tools links available | PASS |
| Products | Create Product | Create product | Browser-created `QA Browser Full Product` | PASS |
| Products | Hide/Make Visible | Toggle public visibility | Hide made public API 404; Make Visible restored 200 | PASS |
| Products | Archive/Restore | Remove from public, list archived, restore hidden | Archive gave confirmation and public 404; Restore returned product as hidden | PASS |
| Products | Duplicate | Create safe duplicate | Opened edit page for copy with unique slug/SKU suffix | PASS |
| Products | Delete | Hard delete | Modal says delete unavailable; archive is intended safe action | INFO |
| Categories | Save | Create category | Created `QA Browser Manual Category`; count increased | PASS |
| Categories | Advanced accordion fields | Fill media/SEO | Some DOM-visible fields were not actionable through Playwright fill | FAIL/UX |
| Storefront | Navigation/Mega/Collections/Filters/Pages/Settings tabs | Switch tabs | Tabs opened in manual and e2e visibility tests | PASS |
| Orders | Update/Details | Update/view order | Controls visible; not mutated manually to avoid changing seeded analytics orders | NOT TESTED |
| Users | Update User | Update role/status | Controls visible; not mutated manually to avoid unsafe account changes | NOT TESTED |
| Discounts | Save/Archive | Create/archive coupons | Controls visible; full targeting matrix not manually submitted | NOT TESTED |
| CMS | Use Template/Add/Save Draft/Publish/Preview/Add block actions | CMS workflow | Page and live preview opened; e2e CMS public flow passed; every block not manually created | PARTIAL |
| Analytics | Presets/Custom/Refresh/Downloads | Filter/export analytics | Presets clicked; charts/tables visible | PASS |

## 4. CRUD Matrix

| Module | Create | Read | Update | Delete/Archive | Restore | Storefront Reflection | Status |
|---|---|---|---|---|---|---|---|
| Products | PASS | PASS | PASS hide/show | PASS archive | PASS restore hidden | PASS PDP/cart/public 404/200 | PASS |
| Categories | PASS | PASS | PARTIAL | Cleanup via Mongo | N/A | PASS route 200 | PARTIAL |
| Storefront Navigation | E2E attempted | PASS | Visibility e2e PASS | Cleanup PASS | N/A | PASS visibility e2e | PARTIAL |
| Mega Menu | E2E visibility PASS | PASS | Visibility e2e PASS | Cleanup PASS | N/A | PASS visibility e2e | PARTIAL |
| Collections | E2E visibility PASS | PASS | Visibility e2e PASS | Cleanup PASS | N/A | PASS visibility e2e | PARTIAL |
| Filters | E2E visibility PASS | PASS | Visibility e2e PASS | Cleanup PASS | N/A | PASS visibility e2e | PARTIAL |
| Pages | Read/edit controls visible | PASS | Not manually saved/restored | N/A | N/A | Not manually verified | PARTIAL |
| Settings | Read/toggles visible | PASS | Not manually saved/restored | N/A | N/A | Not manually verified | PARTIAL |
| Orders | Not created manually | PASS | Not mutated | N/A | N/A | Analytics seeded data visible | PARTIAL |
| Users | Not created manually | PASS | Not mutated | N/A | N/A | N/A | PARTIAL |
| Discounts | Not manually created | PASS | Not mutated | N/A | N/A | CMSHOME10 e2e coupon passed | PARTIAL |
| CMS | Not every block | PASS | Public CMS e2e passed | Not every block | Recently viewed/newsletter e2e | PASS for e2e scope | PARTIAL |

## 5. Admin-to-Storefront Verification

| Admin Action | Backend Updated | Storefront Page | Browser Verified | Status |
|---|---|---|---|---|
| Create QA product | Yes, product API returned title/slug/SKU | `/product/qa-browser-full-product` | PDP rendered title, price, description, variant | PASS |
| Select size/add cart | Cart store updated | PDP/cart drawer | QA product appeared in bag | PASS |
| Hide product | Yes | Product API/PDP | Public API returned 404 | PASS |
| Make visible | Yes | Product API/PDP | Public API returned 200 | PASS |
| Archive product | Yes | Product API/PDP | Public API returned 404 | PASS |
| Restore product | Yes | Product API/PDP | Restored as hidden; public stayed 404 | PASS |
| Create category | Yes | `/collections/[slug]` | Route returned 200 | PASS |
| Storefront visibility tabs | Yes in e2e | Header/menu/collections surfaces | Visibility e2e passed | PASS |

## 6. CMS Deep Block Report

| CMS Block | Draft Hidden | Published Visible | Real Products Used | Real Collections Used | Edit Tested | Duplicate Tested | Hide Tested | Mobile Tested | Status |
|---|---|---|---|---|---|---|---|---|---|
| Announcement Bar | Existing only | Existing visible | N/A | N/A | Not manual | Not manual | Not manual | E2E page mobile | PARTIAL |
| Hero Campaign | Existing only | Existing visible | N/A | N/A | Not manual | Not manual | Not manual | E2E page mobile | PARTIAL |
| Limited Drop Timer | Existing only | Existing visible | N/A | N/A | Not manual | Not manual | Not manual | Not manual | PARTIAL |
| Product Carousel | Existing/e2e | Visible | Yes, e2e PDP launched | N/A | Not manual | Not manual | Not manual | E2E mobile | PARTIAL |
| Newsletter Section | N/A | Visible | N/A | N/A | Not manual | N/A | N/A | E2E mobile | PASS for newsletter |
| Recently Viewed | N/A | Visible after PDP visit | Yes | N/A | N/A | N/A | N/A | E2E mobile | PASS |
| All other listed blocks | Not completed | Not completed | Not completed | Not completed | Not completed | Not completed | Not completed | Not completed | NOT TESTED |

## 7. Storefront Manager Report

| Tab | CRUD Tested | Buttons Tested | Storefront Verified | Status |
|---|---|---|---|---|
| Navigation | Visibility e2e; deep CRUD e2e failed | Add/Edit/Delete/Hide visible | Header visibility e2e passed | PARTIAL |
| Mega Menu | Visibility e2e | Buttons visible | Public menu e2e passed | PARTIAL |
| Collections | Visibility e2e | Buttons visible | Collections route e2e passed | PARTIAL |
| Filters | Visibility e2e | Buttons visible | Listing/filter e2e passed | PARTIAL |
| Pages | Tab opened | Controls visible | Not manually saved | PARTIAL |
| Settings | Tab opened | Toggles visible | Not manually saved | PARTIAL |

## 8. Products Report

Browser-created product:
- Title: `QA Browser Full Product`
- Slug: `qa-browser-full-product`
- Product code: `QA-BROWSER-FULL`
- SKU: `QA-BROWSER-FULL-BLK-M`
- Price: `1299`
- MRP: `1999`
- Cost price: set in admin, verified stripped from public payload.
- Stock: `12`
- Category: `Clothing`
- Flags: featured, bestseller, new arrival, sale.

Verified:
- Admin list showed the product at top.
- Public API returned the product while visible.
- Public API omitted `costPrice`.
- PDP rendered title, price, rich description, material/fit/shipping sections.
- Size `M` selection enabled Add to Cart.
- Add to Cart opened cart drawer with QA product.
- Hide removed product publicly.
- Show restored product publicly.
- Archive removed product publicly.
- Archived filter showed product and Restore button.
- Restore brought it back as hidden.
- Duplicate created a copy with unique suffix.
- QA product documents were removed from Mongo cleanup.

## 9. Catalogues Report

Manual page opened and showed:
- Upload/Preview/Map/Validate/Dry Run/Confirm/Result steps.
- Latest/generate buttons.
- Full CSV export.
- Import/export history controls.

Automated clean e2e results:
- Catalogue preview/dry-run/export/layout test: PASS.
- Responsive catalogue tests at 390 and 768: PASS.

Full downloaded CSV re-import was not manually completed in the in-app browser because the exposed browser API did not provide file upload control in this session. Marked **PARTIAL**, not pass.

## 10. Categories Report

Browser-created category:
- Name: `QA Browser Manual Category`
- Slug: `qa-browser-manual-category-1783527878873`
- Active/visible/published/showInMenu/showInFilters verified in Mongo.
- `/collections/qa-browser-manual-category-1783527878873` returned 200.
- Bare `/qa-browser-manual-category-1783527878873` returned 404, which matches app route structure.

Issue:
- Some advanced category fields were DOM-present but not fillable through Playwright after accordion interaction; this is a UX/testability issue.

Cleanup:
- QA category removed from Mongo; remaining core QA category count 0.

## 11. Orders Report

Verified:
- Orders page opened.
- Search, status filter, payment filter, reset filters, details, status select, tracking, admin note, update buttons visible.
- Seeded analytics orders, payment states, coupons, revenue, customer info, and line items displayed.

Not tested:
- I did not mutate seeded order statuses manually because the request also required analytics integrity and cleanup; no safe dedicated order fixture was created in this run.

## 12. Users Report

Verified:
- Users page opened.
- Search, role filter, active status filter, role selects, active selects, update buttons visible.
- Superadmin row visible.
- No password/token values were visible in table content.

Not tested:
- I did not change user roles/status manually because of account safety risk. Server unit tests include last-superadmin protection coverage.

## 13. Discounts Report

Verified:
- Discounts page opened.
- Coupon form fields visible: code, type, value, min cart, max discount, usage limits, valid dates, active targeting lists.
- Existing coupons loaded.
- CMS/PDP e2e validated a coupon flow using `CMSHOME10`.

Not tested:
- Full matrix of percentage/fixed/free shipping, product/category/collection targeting, expired/inactive/min/max cap behavior was not manually completed.

## 14. Analytics Report

Verified:
- Analytics page opened with KPI cards, trend chart, payment chart, tables.
- Presets clicked: full 60, last 30, previous 30, last 7, this month, last month, sale week, custom.
- Refresh clicked.
- Export/download buttons visible.
- Seeded analytics data displayed revenue, orders, paid orders, AOV, discounts, customers, cancelled/refunded, products, categories, collections, coupon performance.

## 15. Responsive Report

| Width | Admin Pages Tested | Storefront Pages Tested | Overflow Found | Status |
|---|---|---|---|---|
| 1440 | 10 | 6 | No | PASS |
| 1280 | 10 | 6 | No | PASS |
| 1024 | 10 | 6 | No | PASS |
| 768 | 10 | 6 | No | PASS |
| 430 | 5 sampled | 4 sampled | No | PASS |
| 390 | 5 sampled | 4 sampled | No | PASS |
| 360 | 5 sampled | 4 sampled | No | PASS |

E2E also passed Storefront Manager no-overflow checks at all requested widths.

## 16. Security Report

Verified:
- Admin pages require login.
- Protected route `/products` redirected to `/login` after logout.
- Unauthenticated admin products API returned 401.
- Public product payload did not expose `costPrice`.
- Hidden and archived products returned public 404.
- Product archive has confirmation.
- Product hard delete is unavailable by design.
- No password/token leaks were visible in admin tables during manual inspection.

Not fully tested:
- Customer-role admin API rejection was not manually executed.
- XSS payloads and invalid media URLs were not fully browser-submitted in this run.

## 17. Bugs Found And Fixed

| ID | Module | Bug | Root Cause | Fix | Browser Retest |
|---|---|---|---|---|---|
| QA-1 | Categories | Advanced fields appear in DOM but Playwright could not fill `heroTitle` reliably | Accordion/label/input interaction is not test-friendly | Not fixed in this run | Reproduced |
| QA-2 | E2E Admin | `getByLabel('Slug')` strict-mode collision with `Canonical Slug` | Ambiguous accessible labels | Not fixed in this run | E2E failed |
| QA-3 | E2E Admin | Admin dashboard spec expects `Settings` text on a route where it was not visible | Test expectation/page state mismatch | Not fixed in this run | E2E failed |
| QA-4 | Storefront Manager CRUD E2E | Created navigation row was not found after add | UI/test mismatch or failed persistence assertion | Not fixed in this run | E2E failed |

## 18. Files Changed

Created:
- `ADMIN_FULL_LIVE_BROWSER_MANUAL_QA_REPORT.md`

No application source files were intentionally edited by this run. The working tree already contained many modified/untracked application files before QA started.

## 19. Commands Run

```bash
npm install
npm run dev:db
npm --workspace server run seed
npm run dev
curl http://localhost:8000/health
npm run typecheck
npm run lint
npm run build
npm run test
npm run test:e2e
```

Manual cleanup commands used authenticated API/Mongo checks and direct Mongo deletion for temporary QA records.

Regression results:
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- `npm run test`: PASS, 6 server files/22 tests and 1 client file/2 tests
- `npm run test:e2e`: FAIL, 50 passed, 9 skipped, 3 failed

## 20. Cleanup Status

Cleaned:
- QA Browser Full Product and duplicate.
- QA Browser Manual Category.
- Button CRUD / QA Browser prefixed products, categories, collections, navigation, and tags from Mongo.

Cleanup verification:
- Remaining core QA products/categories/collections/navigation/coupons count: 0 for checked prefixes.

Note:
- Browser cart local state may still contain previously added local QA items in the in-app browser session, but public storefront/database QA records were removed.

## 21. Final Checklist

| Item | Status |
|---|---|
| Every sidebar page opened | PASS |
| Every visible major button clicked | PARTIAL |
| Product CRUD tested | PASS |
| Product archive/restore tested | PASS |
| Catalogue import/export tested | PASS for e2e scope, PARTIAL manual |
| Downloaded catalogue re-import tested | NOT TESTED manually |
| Category CRUD tested | PARTIAL |
| Storefront Navigation CRUD tested | PARTIAL; e2e deep CRUD failed |
| Mega Menu CRUD tested | PARTIAL |
| Collections CRUD tested | PARTIAL |
| Filters CRUD tested | PARTIAL |
| Pages settings tested | PARTIAL |
| Storefront settings tested | PARTIAL |
| Orders status update tested | NOT TESTED manually |
| Users role/status update tested | NOT TESTED manually |
| Discounts product/category/collection targeting tested | NOT TESTED manually |
| CMS every block tested | NOT TESTED |
| CMS countdown tested | PARTIAL existing only |
| CMS real products linked | PASS in e2e scope |
| CMS real collections linked | PARTIAL |
| CMS draft/publish/hide/restore tested | NOT TESTED for every block |
| Analytics filters/charts/export tested | PASS for read/filter/download visibility |
| Admin changes verified on storefront | PASS for products/category/storefront visibility e2e |
| Mobile/responsive tested | PASS |
| Security tested | PARTIAL |
| QA data cleaned | PASS |
| Typecheck passed | PASS |
| Lint passed | PASS |
| Build passed | PASS |
| Unit tests passed | PASS |
| E2E passed | FAIL: 50 passed, 9 skipped, 3 failed |
