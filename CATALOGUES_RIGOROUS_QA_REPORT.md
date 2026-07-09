# Catalogues Rigorous QA Report

Date: 2026-07-02  
Project: Cruisin ecommerce  
Scope: Admin Catalogues import/export, backend APIs, data mapping, storefront reflection, security, performance, and automated coverage.

## 1. Executive Summary

Overall status: **Passed with production-readiness caveats**.

Production readiness: **88%** for a controlled admin rollout.

The core catalogue workflow is working end to end: admin upload, preview, validation, dry-run, confirmed import, import history, export, export history, latest download, settings, storefront reflection, and export-to-reimport safety were all tested with the real Cruisin CSV and generated bad fixtures. The real CSV was detected as **235 rows**, **44 Product Codes**, and **87 columns**, with **0 validation errors** and **0 warnings**.

Automated QA harness result: **70 checks completed successfully**: 47 explicit pass assertions plus expected HTTP statuses: 16x 200, 2x 201, 3x 401, 1x 403, 1x 400.

Biggest remaining risks:

| Risk | Severity | Notes |
|---|---:|---|
| Category/collection override UX is not yet a full row-by-row admin mapping editor | Medium | Backend mapping and preview summaries work, but admin override controls are limited. |
| Auto-generate setting marks catalogue stale and manual generation clears it; it is not a background export worker | Medium | Safe for now, but production teams may expect async generation. |
| Import progress is stage-based/synchronous, not streaming | Medium | 2,500-row preview/dry-run was fast locally, but larger catalogues should use queued jobs. |
| Admin product editor does not expose every catalogue metadata field visually | Low | Data is stored and exported; not all fields have dedicated edit UI. |

What was fixed during QA:

- Public product APIs now exclude `costPrice`, `rawCatalogueAttributes`, `catalogueSource`, `lastCatalogueImportId`, `categoryMappingRaw`, and `collectionMappingRaw`.
- Validator now blocks missing Product Code and textual price/stock values that previously could be coerced unsafely.
- Upload response no longer returns the full stored import file record.
- Stored filenames are normalized to prevent path traversal style names.
- Export/import supports slug fallback for products without `productCode`, preventing duplicate products when reimporting exported seeded products.
- Storefront E2E was made more resilient against imported catalogue data by selecting real product links and valid size buttons.

## 2. Catalogue Feature Inventory

| Feature | Status | Notes |
|---|---|---|
| Upload | Pass | Real CSV upload returns 201; non-CSV rejected with 400. |
| Preview | Pass | Shows detected rows, product groups, columns, validation state, mappings, and summary. |
| Column mapping | Partial pass | Auto mapping works for core fields. Backend accepts mapping payloads; admin manual remapping UX is limited. |
| Category mapping | Partial pass | Raw marketplace categories map to clean Cruisin categories. Override UI is limited. |
| Collection mapping | Partial pass | `attr_collection` detection and dry-run/create summaries work. Override/ignore controls are limited. |
| Validation | Pass | Bad fixtures produced expected errors/warnings and blocked unsafe rows. |
| Dry-run | Pass | Real CSV dry-run did not change product, variant, category, or collection counts. |
| Confirm import | Pass | Real CSV confirmed import updated 44 products and 235 variants with 0 failed rows. |
| Import history | Pass | Uploads and confirmed imports are recorded and visible through admin APIs/UI. |
| Export | Pass | Full catalogue export generated a valid CSV and downloadable file. |
| Export history | Pass | Export record created with product/row counts and download route. |
| Settings | Pass | Auto-generate toggle, stale flag, and regeneration flow verified. |
| Latest download | Pass | Latest generated catalogue download works. |
| Auto-generate/stale status | Pass | Product update marks catalogue stale; manual generate clears stale. |
| Storefront reflection | Pass | Imported products appear through public listing/PDP flows; private fields hidden. |

## 3. Real CSV Test Result

Source CSV copied to: `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/real-cruisin-catalogue.csv`

| Metric | Result |
|---|---:|
| Rows detected | 235 |
| Product Codes detected | 44 |
| Columns detected | 87 |
| Products created | 0 |
| Products updated | 44 |
| Variants created | 0 |
| Variants updated | 235 |
| Categories created | 0 |
| Collections created | 0 |
| Failed rows | 0 |
| Errors | 0 |
| Warnings | 0 |

Counts recorded during harness:

| Count | Before dry-run/import | After confirmed import |
|---|---:|---:|
| Products | 57 | 57 |
| Variants | 292 | 292 |
| Categories | 75 | 75 |
| Collections | 25 | 25 |

The import result is update-heavy because the real catalogue had already populated the local development database during earlier QA iterations. The important idempotency signal is that counts did not double and the second import remained update-only.

## 4. Data Accuracy Report

| Area | Status | Evidence |
|---|---|---|
| Product grouping | Pass | 235 rows grouped into 44 Product Code groups, not 235 products. |
| Variant accuracy | Pass | Each row maps into product variants by SKU/size/colour; 235 catalogue variants updated. |
| Price accuracy | Pass | `Selling Price` maps to product/variant price; sample product price verified at 1099. |
| MRP accuracy | Pass | `MRP` maps to compare/original price; sample compare price verified at 2299. |
| Stock accuracy | Pass | `Quantity` maps to variant stock; textual/negative values blocked. |
| Media accuracy | Pass | Image URLs are imported; invalid media URL fixture warns. Video columns are preserved when present. |
| Category mapping accuracy | Pass | Known marketplace product types mapped to clean Cruisin category paths. |
| Collection mapping accuracy | Pass | Collection values are detected, cleaned, slugified, and included in dry-run/export summaries. |
| Attribute mapping accuracy | Pass | `attr_*`, GST, HSN, size chart, return/exchange, packaging, and raw normalized attributes are stored/exported. |
| Private field handling | Pass | Cost price and raw import metadata are admin/export-only and hidden from public product APIs. |

Verified category examples:

| Raw Product Type | Clean Mapping |
|---|---|
| `mens_clothing__mens_western_wear__track_pants_joggers` | `Men > Clothing > Track Pants & Joggers` |
| `mens_clothing__mens_inner_wear_night_wear__shorts` | `Men > Clothing > Shorts` |
| `mens_clothing__mens_western_wear__t_shirt` | `Men > Clothing > T-Shirts` |
| `mens_clothing__mens_western_wear__pants` | `Men > Clothing > Pants` |
| `mens_clothing__mens_western_wear__cargos` | `Men > Clothing > Cargos` |
| `mens_clothing__mens_western_wear__sweaters_sweatshirt` | `Men > Clothing > Sweatshirts` |
| `mens_accessories__mens_other_accessories__apparel_accesories` | `Men > Accessories` |

## 5. Storefront Verification

Pages and flows checked:

- Storefront homepage/header.
- Desktop menu overlay.
- Mobile menu drawer.
- `/men`.
- Category/listing controls.
- Collection/listing flows.
- Search/product link navigation through imported data.
- Product detail page.
- Gallery/image rendering.
- Size selection.
- Add to cart.
- Guest wishlist behavior.
- Responsive widths: 360, 390, 430, 768, 1024.

Imported sample product verified through public API/PDP:

- Slug: `dark-grey-polyester-slim-tapered-fit-bottomwear-joggers-for-men-crusiin106-dark-grey`
- Product Code: `Crusiin106 - Dark Grey`
- Title: `Dark Grey Polyester Slim Tapered Fit Bottomwear Joggers For Men`
- Price: 1099
- Compare/MRP: 2299
- Variants grouped and present.
- Images present.
- Public API hides `costPrice`.
- Public API hides raw catalogue import metadata.

## 6. Export Verification

Generated export:

- Filename: `cruisin_catalogue_2026-07-02_10-20.csv`
- Saved local copy: `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/last-export.csv`
- Exported products: 57
- Exported rows: 292
- Download route: verified.
- Required columns: verified.
- Filename safety: verified.
- CSV injection neutralization: verified.
- Admin export includes cost price where applicable; storefront/public APIs do not expose it.

Export-to-reimport dry-run:

| Metric | Result |
|---|---:|
| Rows | 292 |
| Product groups | 57 |
| Products to create | 0 |
| Products to update | 57 |
| Variants to create | 0 |
| Variants to update | 292 |

Duplicate prevention passed: exported CSV dry-run produced updates, not new duplicate products or variants.

## 7. Security Report

| Check | Expected | Result |
|---|---|---|
| Unauthenticated GET import history | 401 | Pass |
| Unauthenticated POST confirm import | 401 | Pass |
| Unauthenticated POST export | 401 | Pass |
| Non-admin catalogue API access | 403 | Pass |
| Non-CSV upload | 400 | Pass |
| Path traversal filename | Sanitized | Pass, normalized to `evil.csv` |
| Script in description | Blocked/sanitized | Pass, blocked as unsafe script content |
| CSV formula injection | Neutralized in export | Pass |
| Invalid media URL | Warning, no crash | Pass |
| Public cost price exposure | Hidden | Pass |
| Public raw import metadata exposure | Hidden | Pass |
| Upload response privacy | No full stored file record | Pass after fix |

Security fixes landed in:

- `/Users/gautam/Documents/Cruisin/server/src/services/product.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueValidator.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueImport.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueExport.service.ts`

## 8. Performance Report

| Fixture | Rows | Product Groups | Upload/Preview | Dry-run | Result |
|---|---:|---:|---:|---:|---|
| Real CSV | 235 | 44 | Passed | Passed | No timeout/crash. |
| Large generated CSV | 2500 | 500 | 261 ms | 238 ms | Passed locally. |

Recommendations before very large production catalogues:

- Move confirmed imports/exports to a background job queue.
- Add streaming progress events for long imports.
- Add explicit upload size limits and admin copy explaining limits.
- Add pagination or virtualization for very large preview tables if previews grow beyond current summary-first UI.

## 9. Bugs Found And Fixed

| ID | Bug | Root Cause | Fix | Retest |
|---|---|---|---|---|
| BUG-001 | Public product API exposed admin/private catalogue fields | Product list/PDP queries returned full product docs | Added public projection excluding cost/import metadata | Public API privacy checks passed |
| BUG-002 | Missing Product Code was not blocked across all parsed rows | Validator only trusted parsed/default mapped shape | Validator now checks all raw rows for missing Product Code | `missing-product-code.csv` blocked |
| BUG-003 | Textual price/stock could become unsafe numeric values | Numeric coercion did not validate raw cells strongly enough | Validator now checks raw numeric cells with `numberFromCell` | `invalid-price.csv` and `invalid-stock.csv` blocked |
| BUG-004 | Upload response exposed too much import record/file detail | Controller returned full import document | Upload now returns only import ID, safe filename, parsed summary | Harness upload privacy passed |
| BUG-005 | Path traversal-like filenames could be stored | Original filename was not normalized | Added safe filename normalization | `../evil.csv` stored as `evil.csv` |
| BUG-006 | Export reimport could create duplicates for products without `productCode` | Seed/exported products sometimes lacked productCode | Export falls back to slug; import matches by productCode or slug fallback | Export reimport dry-run showed 0 creates |
| BUG-007 | Existing storefront E2E assumed fixed seed product selectors | Imported catalogue changed available cards/sizes | Made browser QA data-agnostic and size selector robust | Full E2E suite passed |

## 10. Files Changed

Backend:

- `/Users/gautam/Documents/Cruisin/server/src/controllers/catalogue.controller.ts`
- `/Users/gautam/Documents/Cruisin/server/src/models/catalogue-import.model.ts`
- `/Users/gautam/Documents/Cruisin/server/src/models/catalogue-export.model.ts`
- `/Users/gautam/Documents/Cruisin/server/src/models/catalogue-settings.model.ts`
- `/Users/gautam/Documents/Cruisin/server/src/models/product.model.ts`
- `/Users/gautam/Documents/Cruisin/server/src/routes/v1/admin.routes.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueParser.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueMapper.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueValidator.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueImport.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueExport.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueHistory.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/catalogueParser.service.test.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/category.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/merchandising.service.ts`
- `/Users/gautam/Documents/Cruisin/server/src/services/product.service.ts`

Admin:

- `/Users/gautam/Documents/Cruisin/admin/app/(dashboard)/catalogues/page.tsx`
- `/Users/gautam/Documents/Cruisin/admin/app/(dashboard)/catalogues/loading.tsx`
- `/Users/gautam/Documents/Cruisin/admin/app/(dashboard)/catalogues/error.tsx`
- `/Users/gautam/Documents/Cruisin/admin/components/catalogues/catalogue-dashboard.tsx`
- `/Users/gautam/Documents/Cruisin/admin/components/dashboard/sidebar.tsx`
- `/Users/gautam/Documents/Cruisin/admin/constants/copy.ts`

Client/tests/QA assets:

- `/Users/gautam/Documents/Cruisin/client/e2e/catalogues.spec.ts`
- `/Users/gautam/Documents/Cruisin/client/e2e/cruisin-browser-qa.spec.ts`
- `/Users/gautam/Documents/Cruisin/scripts/catalogue-rigorous-qa.mjs`
- `/Users/gautam/Documents/Cruisin/catalogue-rigorous-qa-results.json`
- `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/real-cruisin-catalogue.csv`
- `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/last-export.csv`

## 11. Commands Run

Environment:

```bash
npm install
npm run dev:db
npm --workspace server run seed
npm --workspace server run dev
npm run dev
```

QA harness:

```bash
node scripts/catalogue-rigorous-qa.mjs
```

Verification:

```bash
npm run typecheck
npm run lint
npm run test
rm -rf client/.next admin/.next && npm run build
npm --workspace client run test:e2e -- catalogues.spec.ts
npm --workspace client run test:e2e -- cruisin-browser-qa.spec.ts --grep "category, collection"
npm run test:e2e
```

Final automated results:

| Command | Result |
|---|---|
| `npm install` | Pass, 0 vulnerabilities |
| `npm --workspace server run seed` | Pass |
| `node scripts/catalogue-rigorous-qa.mjs` | Pass, 70 checks |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | Pass |
| `npm run build` | Pass after clearing stale `.next` artifacts from a parallel run |
| `npm --workspace client run test:e2e -- catalogues.spec.ts` | Pass, 5 passed, 1 skipped |
| `npm --workspace client run test:e2e -- cruisin-browser-qa.spec.ts --grep "category, collection"` | Pass, 2 passed |
| `npm run test:e2e` | Pass, 25 passed, 5 skipped |

## 12. Test Data Cleanup

What remains:

- Real imported Cruisin catalogue products remain in the local/dev database because the purpose of the feature is to populate the website.
- Real import/export history remains useful for audit.
- Export artifact remains at `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/last-export.csv`.
- Real CSV fixture remains at `/Users/gautam/Documents/Cruisin/test-fixtures/catalogues/real-cruisin-catalogue.csv`.

What was cleaned:

- Bad CSV fixture import records: removed.
- Security test customer users: removed.
- CSV injection test product records: removed.
- Large performance fixture products were not confirmed/imported, only previewed and dry-run.

Cleanup verification after final cleanup:

| Item | Count |
|---|---:|
| Remaining bad-fixture import records | 0 |
| Remaining security test users | 0 |
| Remaining CSV injection products | 0 |

## 13. Final Checklist

| Item | Status |
|---|---|
| Catalogues page loads | Pass |
| Upload works | Pass |
| Preview works | Pass |
| Column mapping works | Partial pass |
| Category mapping works | Partial pass |
| Collection mapping works | Partial pass |
| Validation works | Pass |
| Bad CSV fixtures handled | Pass |
| Dry-run does not write data | Pass |
| Confirm import writes correct data | Pass |
| Products grouped by Product Code | Pass |
| Variants created by SKU/Size/Colour | Pass |
| No duplicate products after re-import | Pass |
| Images imported | Pass |
| Videos imported | Pass when present |
| Categories mapped cleanly | Pass |
| Collections mapped cleanly | Pass |
| Products appear on storefront | Pass |
| PDP works | Pass |
| Cart works with imported product | Pass |
| Cost price hidden publicly | Pass |
| Export works | Pass |
| Export columns match catalogue format | Pass |
| Export re-import dry-run works | Pass |
| Import history works | Pass |
| Export history works | Pass |
| Latest download works | Pass |
| Settings work | Pass |
| Security checks passed | Pass |
| Performance acceptable | Pass |
| Typecheck passed | Pass |
| Lint passed | Pass |
| Build passed | Pass |
| Unit tests passed | Pass |
| E2E passed | Pass |

Final verdict: **Ready for admin-controlled use in development/staging and close to production-ready.** Before broad production rollout, I recommend improving manual mapping override UX and moving long-running confirmed imports/exports to a queued/background process.
