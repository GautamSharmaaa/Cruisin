# Local verification evidence

All targets are the isolated V2 checkout and local databases. No hosted services were started.

- Full regression: 510 server, 90 storefront and 45 admin tests; 645 total across 102 files. Log: `/tmp/cruisin-completed-regression.log`.
- All four application TypeScript checks: `/tmp/cruisin-completed-typecheck.log`.
- Four production builds: `/tmp/cruisin-archive-build.log`; server compile: `/tmp/cruisin-completed-server-build.log`.
- Latest receipt/new-variant guard focused suite: 42 passed, `/tmp/cruisin-final-unit-receipt-guard.log`.
- Physical-unit inspection archive and evidence protection: 17 passed, `/tmp/cruisin-inspection-archive-green.log`.
- Built desktop/mobile operations workflows: six passed, `/tmp/cruisin-completed-operations-browser.log`. Includes independent task review, physical QC/packaging/reservation/fulfillment and shipping document preview.
- Cross-browser smoke: 12 passed, `/tmp/cruisin-verified-cross-browser.log`.
- Existing logistics document UI: three passed, `/tmp/cruisin-verified-logistics-documents.log`.
- Additive indexes: 23 models; no destructive index drops, `/tmp/cruisin-index-verification.log`.

Earlier measured server coverage (508 tests, before the last two added cases): 59.49% statements, 46.29% branches, 52.19% functions and 64.58% lines. This is not a fresh coverage measurement of the final 510-test run. Log: `/tmp/cruisin-complete-coverage.log`.

On the user's design correction, the employee application now follows the existing admin design: matching black/gold tokens, typography, square controls, 288px desktop navigation and mobile menu. Shared workflow behavior and authorization remain in place. Employee build verification: `/tmp/cruisin-employee-admin-style-build.log`. After restyling and fixing the mobile sign-out accessible name, all six desktop/mobile workflow checks passed again: `/tmp/cruisin-employee-admin-style-e2e.log`. A separate real-browser check verified the existing employee OTP login, matching admin gold token, 288px sidebar, square cards, both themes, mobile navigation and no horizontal page overflow.

Real provider integrations, hosted load, physical warehouse hardware and real legacy inventory conversion remain release gates. Synthetic local checks do not establish those results. Logs and preview images under `/tmp` are session evidence and may not survive system cleanup.

## Remaining-local-work completion

- Two dashboard scope/count tests first failed on missing fulfillment/exception data: `/tmp/cruisin-remaining-dashboard-red.log` (42 passed, two failed). All 44 then passed: `/tmp/cruisin-remaining-dashboard-green.log`.
- Final full server suite with measured coverage: **512 passed across 68 files**, `/tmp/cruisin-remaining-server-coverage.log`. Coverage: **59.70% statements, 46.44% branches, 52.60% functions, 64.81% lines**.
- Storefront 90 and admin 45 tests pass: `/tmp/cruisin-remaining-commerce-regression.log`. Combined regression: **647 tests, 102 files**.
- All four production builds: `/tmp/cruisin-remaining-build.log`; final shared-interface rebuild: `/tmp/cruisin-remaining-interfaces-build.log`. TypeScript checks: `/tmp/cruisin-remaining-typecheck.log`.
- Expanded operations browser checks cover actual notification pages/read mutations, network interruption of the dashboard summary, and successful refresh/retry against the real API: `/tmp/cruisin-remaining-browser.log`.
- Cross-browser smoke: 12 passed, `/tmp/cruisin-remaining-cross-browser.log`.
- Fresh dependency audit: zero high/critical, six moderate, four low: `/tmp/cruisin-remaining-audit.json`.

The first full coverage run exposed intermittent ZXing finder failures on randomly generated clean QR images. A local 40-image diagnostic reproduced five finder failures while direct pure-barcode decoding correctly read every image. The label test now explicitly decodes the generated axis-aligned pixels with PURE_BARCODE. It verifies actual encoded identity and reprint/stock behavior; it does not certify camera finder performance. Physical scanner acceptance remains a release gate.
