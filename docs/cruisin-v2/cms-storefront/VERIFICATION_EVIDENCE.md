# Local verification evidence

Verified 2026-11-08 against the isolated V2 checkout. No hosted deployment or production mutation was performed. Mongo test database: `cruisin-sync-order-analytics-tests` on local port 27983; Redis test database 14 on port 6392. Browser acceptance targets local ports 3192, 3193 and 8192 only and uses synthetic accounts/data.

## Current reference editor

- Full automated regression: **661 tests across 105 files passed**: server 524/70, storefront 92/25, admin 45/10. Log: `/tmp/cruisin-studio-all-tests.log`.
- All four applications' production builds passed: `/tmp/cruisin-studio-release-build.log`. Subsequent preview polish was rebuilt for admin and storefront in `/tmp/cruisin-studio-admin-polish-build.log` and `/tmp/cruisin-studio-client-polish-build.log`.
- All four TypeScript checks passed: `/tmp/cruisin-studio-typecheck-release.log`. Next production builds also check changed application types.
- Shared presentation checks reject unsafe CTA links and unsupported overlay values. Backend integration verifies public/draft isolation, invalid preview rejection, canonical department hydration, referenced media deletion protection, and restore-to-draft isolation (6 cases).
- Five local Chromium acceptance cases exercise real publication boundaries, the connected editor, responsive storefront commerce, and smooth/reduced-motion behavior. The editor test includes initial selection, canvas-to-inspector selection, media thumbnails and upload, multiple CTA destinations, overlay slider, visibility, desktop/mobile canvas widths and zoom, keyboard tabs/modal escape/focus restoration, duplicate/reorder/remove, history controls and independent department page switches. Final output is recorded in `/tmp/cruisin-studio-browser-polish.log`.
- Frontend Shiprocket secret scan passed over 245 built files: `/tmp/cruisin-studio-secrets.log` (rerun after final build).
- Desktop/mobile screenshots: `docs/qa/screenshots/cruisin-v2-cms-studio-desktop.png` and `cruisin-v2-cms-studio-mobile.png`.

## Prior storefront verification retained

The preceding motion implementation also passed 12 Chromium/mobile Chromium/Firefox/WebKit commerce cases and 6 admin/employee operations cases. Historical logs are `/tmp/cruisin-motion-cross-browser.log` and `/tmp/cruisin-motion-operations-browser.log`. These counts are prior-run evidence, not additional tests in the current five-case editor run. Farak desktop/mobile observations and motion behavior are documented separately. No physical-device performance guarantee is implied by browser emulation.

The broader enterprise CMS migration remains in progress as specified in the implementation report; this evidence covers the implemented editor, storefront and existing regression suite.
