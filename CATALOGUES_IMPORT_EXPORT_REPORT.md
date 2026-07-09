# Catalogues Import/Export Report

## 1. What Was Built

Built a backend-connected, MongoDB-backed admin Catalogues section for importing Nushop-style catalogue CSV files, previewing grouped product data, validating/dry-running imports, safely upserting products/categories/collections/variants/media, storing import/export history, and generating downloadable catalogue CSV exports.

## 2. Admin Catalogues URL

Admin route: `/catalogues`

Backend API namespace: `/api/v1/admin/catalogues`

## 3. Import Workflow

1. Admin uploads a `.csv` file in the Catalogues section.
2. Backend stores the original CSV privately on the `CatalogueImport` record.
3. Parser reads headers, rows, and groups data by `Product Code`.
4. Admin sees row count, product group count, column count, warnings/errors, category suggestions, collection suggestions, and first 20 product groups.
5. Admin selects import mode.
6. Admin runs dry run.
7. Admin confirms import only if blocking errors are clear.
8. Backend upserts products and records import summary/history.

## 4. Export Workflow

Admin clicks Generate in `/catalogues`. Backend generates a UTF-8 CSV in the same catalogue shape, stores it on `CatalogueExport`, updates latest export settings, and returns the file for download.

Latest export can be downloaded from the dashboard.

## 5. CSV Columns Supported

The parser/exporter supports the full uploaded 87-column catalogue format, including:

`Product Code`, `Amazon ASIN`, `Name`, `Sku Id`, `Selling Price`, `MRP`, `Cost Price`, `Quantity`, packaging dimensions/weight, `GST %`, `Image 1` through `Image 10`, `Video 1`, `Video 2`, `Product Type`, `Size Type`, `Size`, `Colour`, description, return/exchange fields, visibility, size chart, pickup address, HSN, and all `attr_*` columns.

## 6. Product Grouping Logic

Rows are grouped by `Product Code`.

One product is created/updated per unique `Product Code`. Sparse later rows inherit product-level fields from the first available row in the group, which matches the uploaded catalogue where variant rows often leave media/category/description blank.

## 7. Variant Mapping Logic

Each CSV row in a product group becomes one variant:

- `Sku Id` -> variant `sku`
- missing SKU -> stable SKU from product code, size, and color
- `Size` -> variant `size`
- `Colour` -> variant `color`, with group fallback
- `Quantity` -> variant `stock`
- `Selling Price` -> variant price
- `MRP` -> compare price
- `Cost Price` -> admin-only product cost metadata
- duplicate SKUs are warned and merged by SKU

## 8. Category Mapping Logic

Default mappings include:

- `mens_clothing__mens_western_wear__track_pants_joggers` -> Men > Clothing > Track Pants & Joggers
- `mens_clothing__mens_inner_wear_night_wear__shorts` -> Men > Clothing > Shorts
- `mens_clothing__mens_western_wear__t_shirt` -> Men > Clothing > T-Shirts
- `mens_clothing__mens_western_wear__pants` -> Men > Clothing > Pants
- `mens_clothing__mens_western_wear__cargos` -> Men > Clothing > Cargos
- `mens_clothing__mens_western_wear__sweaters_sweatshirt` -> Men > Clothing > Sweatshirts
- `mens_accessories__mens_other_accessories__apparel_accesories` -> Men > Accessories

For `others_...` product types, the mapper infers category from product name and attributes. It avoids creating marketplace-style raw names such as `others_69313...`.

## 9. Collection Mapping Logic

`attr_collection` is split by comma. Collections are created or reused by slug and linked to imported products. Empty collection values are ignored.

## 10. Media Mapping Logic

- `Image 1` is treated as primary image.
- `Image 2` through `Image 10` are gallery images.
- First available image is used as fallback primary image.
- Missing images receive a placeholder image.
- `Video 1` and `Video 2` map to product video fields.
- URLs are validated and invalid media URLs are warnings, not crashes.
- Image alt text defaults to product name.

## 11. Validation Rules

Blocking errors:

- Missing product name
- invalid selling price
- invalid MRP
- invalid stock
- unsafe script content in description

Warnings:

- missing SKU
- missing size/color
- duplicate SKU
- selling price greater than MRP
- invalid image/video URL
- unknown/inferred category mapping

Errors block import. Warnings are allowed after dry run/confirmation.

## 12. Admin UI/UX Notes

The Catalogues page includes:

- dashboard stats
- upload panel
- delimiter selector
- import mode selector
- preview table
- validation panels
- dry-run summary
- confirm import action
- export panel
- latest export download
- import history
- export history
- error report download
- stale/current catalogue status
- auto-generate setting toggle

## 13. Test Results

Passed:

- `npm run typecheck` in `server`
- `npm run lint` in `server`
- `npm run build` in `server`
- `npm run test` in `server`: 3 files, 12 tests passed
- `npm run typecheck` in `admin`
- `npm run lint` in `admin`
- `npm run build` in `admin`
- `npm run build` in `client`
- `npm run test` in `client`: 1 file, 2 tests passed
- `npm run typecheck` in `client` after Next build regenerated `.next/types`
- `npm run test:e2e`: 20 passed, 4 skipped by existing viewport guards

Note: the first standalone client typecheck failed before client build because stale `.next/types` entries referenced missing generated files. After `next build` regenerated those files, client typecheck passed.

## 14. Files Changed

Backend:

- `server/src/controllers/catalogue.controller.ts`
- `server/src/models/catalogue-import.model.ts`
- `server/src/models/catalogue-export.model.ts`
- `server/src/models/catalogue-settings.model.ts`
- `server/src/models/product.model.ts`
- `server/src/routes/v1/admin.routes.ts`
- `server/src/services/catalogueParser.service.ts`
- `server/src/services/catalogueMapper.service.ts`
- `server/src/services/catalogueValidator.service.ts`
- `server/src/services/catalogueImport.service.ts`
- `server/src/services/catalogueExport.service.ts`
- `server/src/services/catalogueHistory.service.ts`
- `server/src/services/catalogueParser.service.test.ts`
- `server/src/services/product.service.ts`
- `server/src/services/category.service.ts`
- `server/src/services/merchandising.service.ts`

Admin:

- `admin/app/(dashboard)/catalogues/page.tsx`
- `admin/app/(dashboard)/catalogues/loading.tsx`
- `admin/app/(dashboard)/catalogues/error.tsx`
- `admin/components/catalogues/catalogue-dashboard.tsx`
- `admin/components/dashboard/sidebar.tsx`
- `admin/constants/copy.ts`

## 15. How To Upload/Import A Catalogue

1. Open admin `/catalogues`.
2. Choose the CSV file.
3. Select delimiter if not comma.
4. Click Upload Preview.
5. Review rows, product groups, warnings, errors, categories, and collections.
6. Select import mode.
7. Click Dry Run.
8. If the dry run is acceptable, click Confirm Import.

## 16. How To Generate/Download Catalogue

1. Open admin `/catalogues`.
2. Click Generate.
3. The CSV downloads immediately and is stored in export history.
4. Use Latest to download the most recent generated export.

## 17. Known Limitations

- Import progress is synchronous for the current CSV size; the UI shows stage state but not a streaming background-job progress channel.
- Category/collection override UI is represented by backend-supported mapping payloads and preview output, but the first UI pass focuses on suggested mappings and safe defaults.
- Auto-generation setting currently marks the catalogue stale after product/category/collection changes. Admin can regenerate from the Catalogues page.
- Original CSV files are stored privately in MongoDB text fields rather than Cloudinary/object storage.

## 18. Safety Rules

- All APIs require admin auth.
- Only CSV uploads are accepted.
- Upload size is limited to 10 MB.
- Imports require preview and dry run before confirmation in the admin UI.
- Products match by `Product Code`.
- Variants match by SKU.
- Re-importing updates existing products instead of duplicating product codes.
- Empty CSV product-level values do not wipe populated group values because product data is inherited across the group.
- Images are appended without duplicate URLs by default.
- Missing images do not crash import.
- Cost price is stored on backend product metadata and is not part of public storefront DTO mapping.
- CSV export protects against formula injection.
- Description HTML is sanitized and script content blocks import.
- Product/category/collection changes mark catalogue export as stale.
