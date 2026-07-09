# Admin Remaining Manual Browser QA Report

Date: 2026-07-08  
Environment: local dev stack, Mongo Docker container, API `:8000`, storefront `:3000`, admin `:3001`  
Overall result: PARTIAL

## Executive Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Clean stack | PASS | `npm run dev:db`, `npm --workspace server run seed`, and `npm run dev` were run. API health returned `{"success":true,"data":{"status":"ok"},"message":"API healthy"}`. Ports `3000`, `3001`, and `8000` were owned by the fresh dev stack. |
| Admin login smoke | PASS | Live browser opened `http://localhost:3001/login`, filled `admin@cruisin.local` / admin password, clicked `Enter Dashboard`, reached `http://localhost:3001/`; admin console errors/warnings: `0`. |
| Admin page/control sweep | PARTIAL | Live browser visited `/cms`, `/storefront`, `/discounts`, `/categories`, `/catalogues`, `/orders`, `/users`, `/analytics`. Main controls and forms were visible and console-clean, but this was not full CRUD for every requested tab/button. |
| CMS 20-block manual workflow | FAIL | CMS page loaded and block library was visible, but the requested add/fill/save/publish/restore/cleanup matrix was not completed. The UI exposes repeated generic `ADD` / `PREVIEW` buttons and the attempted full 20-block browser run did not leave persisted QA sections. |
| Storefront Manager exhaustive tab CRUD | PARTIAL | Storefront Manager loaded with tabs `Navigation`, `Mega Menu`, `Collections`, `Filters`, `Pages`, `Settings`; navigation controls were visible. Exhaustive add/edit/hide/show/delete/reload/storefront verification was not completed in this manual pass. |
| Discounts exhaustive coupon matrix | PARTIAL | Discounts page loaded with coupon form controls and existing coupons. The 10 requested cart applicability scenarios were not manually completed in this pass. |
| Category manual CRUD slice | PASS | Live browser filled category form using stable field IDs, saved `Manual Browser Category 1783531968338`, verified Mongo document, verified storefront `GET /category/manual-browser-category-1783531968338` returned `200`, then deleted the QA category. |
| Catalogue import/export | PARTIAL | Catalogue page was included in admin sweep. Browser download/reimport was not completed manually in this pass. |
| Orders lifecycle | PARTIAL | Orders page loaded with order status/tracking/admin note controls. No manual status transition was submitted in this pass. |
| Users safe role/status | PARTIAL | Users page loaded with role/status controls. No safe user mutation was submitted in this pass. |
| Analytics live update | PARTIAL | Analytics page loaded with export, range, refresh, and report download controls. No live order/coupon delta was generated and reconciled. |
| Responsive storefront smoke | PASS | Live browser viewport checks at `360`, `390`, `430`, `768`, `1024`, and `1280` px found no horizontal overflow on storefront home. |
| Security smoke | PARTIAL | Unauthenticated protected API calls returned `401`. Malformed JSON login returned `500`, which should be fixed to `400`. |
| Cleanup | PASS | Pattern cleanup removed QA/manual/browser artifacts; final counts for categories/products/coupons/cmssections/navigationitems/collections/pagesettings/newslettersubscribers were all `0`. |

## Clean Stack Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Mongo Docker container | PASS | `cruisin-mongo-1` running on `27017`. |
| Seed | PASS | Seed completed before browser QA. |
| API health | PASS | `curl http://localhost:8000/health` returned API healthy JSON. |
| Storefront HTTP | PASS | `curl http://localhost:3000/` returned `200` and a 167340-byte HTML response. |
| Admin login browser | PASS | Browser login reached dashboard root. |
| Admin console | PASS | No admin warnings/errors after login and sampled admin pages. |
| Storefront console | WARNING | Repeated Next.js LCP image priority warning for the hero image; no functional browser error observed. |

## Manual Browser Evidence Log

| Page | Browser evidence | Result |
| --- | --- | --- |
| `/cms` | Headings: `CMS Builder`, `Homepage`; buttons included `USE TEMPLATE`, `ADD SECTION`, `SAVE DRAFT`, `SHOW DISABLED`, `PUBLISH`; block library exposed repeated `ADD` and `PREVIEW` controls. | PARTIAL |
| `/storefront` | Headings: `Storefront`, `Header Navigation Manager`; tabs/buttons included `NAVIGATION`, `MEGA MENU`, `COLLECTIONS`, `FILTERS`, `PAGES`, `SETTINGS`, `ADD NAVIGATION`, edit/delete/hide controls. | PARTIAL |
| `/discounts` | Headings: `Discounts`, `Campaign Basics`, `Eligible products and categories`; coupon fields `Code`, `Type`, `Value`, `Minimum cart value`, `Maximum discount`, `Total usage limit`, dates, and `SAVE` visible. | PARTIAL |
| `/categories` | Headings: `Categories`, `Category Form`, `Category Library`; form fields visible; one live create/persist/storefront/cleanup slice completed. | PASS |
| `/catalogues` | Page visited during sweep; catalogue controls were available but export/reimport was not manually completed. | PARTIAL |
| `/orders` | Orders table and per-order `Status`, `Tracking`, `Admin note` controls visible. | PARTIAL |
| `/users` | Users table and repeated `Role`, `Active`, `UPDATE USER` controls visible. | PARTIAL |
| `/analytics` | Headings included `Analytics`, `Revenue And Orders Trend`, `Payment Status`, `Top Products`; controls included `EXPORT CSV`, date ranges, `REFRESH`, report downloads. | PARTIAL |

## Category CRUD Slice

| Step | Result | Evidence |
| --- | --- | --- |
| Create in admin UI | PASS | Browser filled `Manual Browser Category 1783531968338`, slug `manual-browser-category-1783531968338`, description, then clicked `SAVE`. |
| UI confirmation | PASS | Category name was found in the admin categories page after save. |
| Backend/DB verification | PASS | Mongo returned document with name, slug, path, and `isActive: true`. |
| Storefront verification | PASS | `GET http://localhost:3000/category/manual-browser-category-1783531968338` returned `200`. |
| Cleanup | PASS | Temporary category removed; final matching category count: `0`. |

## Responsive Smoke

| Width | Page | Result | Evidence |
| --- | --- | --- | --- |
| 360 | Storefront home | PASS | Headings rendered; `scrollWidth` equaled `clientWidth`; no horizontal overflow. |
| 390 | Storefront home | PASS | Same. |
| 430 | Storefront home | PASS | Same. |
| 768 | Storefront home | PASS | Same. |
| 1024 | Storefront home | PASS | Same. |
| 1280 | Storefront home | PASS | Same. |

## Security Smoke

| Check | Result | Evidence |
| --- | --- | --- |
| No-auth admin categories API | PASS | `GET /api/v1/admin/categories` returned `401 Authentication required`. |
| No-auth orders API | PASS | `GET /api/v1/orders` returned `401 Authentication required`. |
| Malformed JSON login | FAIL | `POST /api/v1/auth/login` with malformed JSON returned `500 Internal server error`; expected clean `400` validation/parse error. |
| Storefront script query | PARTIAL | `/search?q=<script>alert(1)</script>` returned `404`; no reflected script string was found in the response file, but this is not a complete XSS suite. |

## Cleanup Confirmation

Before cleanup, explicit QA/manual/browser records were found:

```json
{"categories":42,"products":40,"coupons":0,"cmssections":42,"navigationitems":0,"collections":0,"pagesettings":0,"newslettersubscribers":0}
```

Cleanup removed only records matching explicit QA/manual/browser patterns. Final verification:

```json
{"categories":0,"products":0,"coupons":0,"cmssections":0,"navigationitems":0,"collections":0,"pagesettings":0,"newslettersubscribers":0}
```

## Findings

| Severity | Finding | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | Requested CMS 20-block workflow was not manually completed. | CMS exposes repeated generic `ADD` / `PREVIEW` buttons; attempted full run did not persist QA sections. | Add unique accessible names/test IDs per CMS library block action, then rerun full manual matrix. |
| Medium | Several admin controls remain hard to target or audit manually because labels are blank or repeated. | Storefront form select/checkbox controls and Users repeated role/status controls appeared with blank/repeated labels in browser extraction. | Add unique labels or `aria-label`s for repeated row controls and tab-specific form fields. |
| Medium | Malformed JSON returns `500` from auth login. | `POST /api/v1/auth/login` with invalid JSON returned `500 Internal server error`. | Add Express JSON parse error middleware that returns `400 Bad Request`. |
| Low | Storefront hero image emits Next.js LCP priority warning. | Browser console warning repeated during responsive checks. | Add `priority` to the above-the-fold hero image if appropriate. |

## Final Checklist

| Requirement | Status |
| --- | --- |
| Live browser opened and used | PASS |
| Clean local stack verified | PASS |
| Backend/API/DB verified where relevant | PASS for completed slices; PARTIAL overall |
| Storefront verified where relevant | PASS for homepage responsive and category slice; PARTIAL overall |
| Full CMS 20-block manual matrix | FAIL |
| Full Storefront Manager tab CRUD matrix | PARTIAL |
| Full coupon targeting matrix | PARTIAL |
| Orders/users/analytics lifecycle mutations | PARTIAL |
| Cleanup/restoration | PASS |
| Report avoids claiming automated-only PASS | PASS |

Final status: PARTIAL. The completed slices have real live-browser and backend/storefront evidence, but the entire requested remaining manual QA matrix was not genuinely completed end to end.
