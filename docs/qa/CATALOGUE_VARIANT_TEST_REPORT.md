# Catalogue Variant Test Report

Status: **complete/pass**. Validation, preview, confirmation, history, Admin/
storefront reflection, export, formula safety, re-import and cleanup were tested.

## Fixture results

| Fixture | Rows | Products/groups | Variants | Errors | Warnings | Result |
|---|---:|---:|---:|---:|---:|---|
| Valid isolated QA catalogue | 6 | 2 | 6 | 0 | 0 | Confirmed; second confirmation updated without duplicates |
| Deliberately invalid catalogue | 4 | — | — | 7 | 2 | Correctly blocked; history marked failed/completed |
| Real legacy Cruisin catalogue | 235 | 44 | 235 | 0 | 44 | Accepted; one missing-HEX inference warning per product/color |
| Final clean production export | 292 | production data | 292 | 0 | expected only | Re-import dry-run remained lossless; history status Current |

## Evidence chain

| Stage | Result | Evidence |
|---|---|---|
| Schema/parser/export mapping | Pass | Color label, HEX, size, SKU, stock, price, enabled and per-variant media map both ways |
| Upload and preview | Pass | Admin control and preview inspected; real multipart upload completed through API and Playwright |
| Dry-run grouping and errors | Pass | Valid rows group into two products; invalid input reports row-specific blockers and warnings |
| Confirmation and history | Pass | Valid confirmation completed; duplicate confirmation updated rather than cloning; invalid history closes as failed |
| Admin/storefront reflection | Pass | Imported QA variants appeared in product editor, facets and PDP selection |
| Export and formula safety | Pass | CSV quoting and formula-like cells are escaped; exported data retains variant identity |
| Export re-import dry run | Pass | Generated export parsed with no loss of variant color/size/HEX/SKU/stock/price/media/enabled fields |
| QA cleanup | Pass | Both `QA-CATALOGUE-*` products archived; final clean export regenerated afterward |

## Legacy compatibility decision

`Color HEX` is required for newly authored explicit values, but a missing or
blank value in a legacy catalogue no longer destroys importability. The parser
uses deterministic named-color inference (for example Dark Grey `#3F3F46`, Olive
`#708238`, Electric Blue `#0066FF`, Mustard `#D4A017`) and emits a deduplicated
warning. An explicitly supplied invalid HEX remains a blocking error.

The in-app Browser runtime cannot programmatically populate a native local-file
chooser. This is a harness limitation, not a skipped product path: the rendered
control was manually inspected, the real endpoint was exercised, and Playwright
used the same file input through `setInputFiles`.
