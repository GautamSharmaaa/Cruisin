# Catalogues Full Browser QA Report

Date: 2026-07-09  
Environment: local Mongo Docker container, API `:8000`, storefront `:3000`, admin `:3001`

## Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Admin Catalogue page load | PASS | Live in-app browser opened `/catalogues`; heading, KPIs, import, export, settings, import history, and export history were visible. |
| Console/layout | PASS | No browser console errors; no horizontal overflow at `1440`, `1280`, `1024`, `768`, `430`, `390`, `360`. |
| Upload preview | PASS | Dedicated browser spec uploaded `real-cruisin-catalogue.csv`, previewed `235` rows and `44` product groups. |
| Validation | PASS | Invalid extension rejected with `400`; invalid-price fixture returned validation error `Invalid selling price`. |
| Dry run | PASS | Real CSV dry run completed; confirm button became enabled in the browser spec. |
| Confirm import | PASS | QA-only CSV created `1` product, `1` variant, and `1` collection; product was verified in Mongo and cleaned up. |
| Export | PASS | Browser spec generated a CSV export with expected filename pattern; API/dashboard reflected latest export rows. |
| Latest/history/report controls | PASS | Latest, Generate, Report, Download, Import History, and Export History controls rendered; error report endpoints returned CSV-capable responses through covered route flow. |
| Settings | PASS | `Auto-generate after catalogue changes` toggled via live browser label click, showed `Catalogue settings saved.`, and was restored to original state. |
| Cleanup | PASS | QA confirm product, QA import record, and QA collection removed. Empty zero-row import artifacts removed. |

## Fix Applied

| File | Fix | Why |
| --- | --- | --- |
| `server/src/services/catalogueImport.service.ts` | Added `assertImportableCatalogue` and applied it to upload, preview, dry run, and confirm. | Prevents empty/no-product CSV payloads from creating successful zero-row pending imports. |

## Verification Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm --workspace server run test` | PASS: 6 files, 22 tests |
| `npm --workspace client run test:e2e -- e2e/catalogues.spec.ts` | PASS: 5 passed, 1 expected mobile skip |

## Notes

- The in-app browser surface does not expose a file upload setter, so true file selection was covered by the dedicated Playwright browser spec. The in-app browser was used for live page load, console, responsive, export/settings control, and layout checks.
- A direct no-row CSV upload now returns `400` with `Catalogue CSV must include at least one product row`.
