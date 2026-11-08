# Workspace verification — 2026-11-08

> Dashboard design withdrawn at the user’s request on 2026-11-08. The previous admin and employee dashboards are restored. Footer, cursive storefront branding and window-grid changes remain. Dashboard descriptions/screenshots below are historical.

All checks target the isolated local V2 applications only. No hosted services were started and no deployment was made.

- Full automated regression: **661 tests across 105 files passed** (524 server, 92 storefront, 45 admin), `/tmp/cruisin-workspace-complete-tests.log`.
- All four app production builds passed after the notifications/packing preservation work: `/tmp/cruisin-workspace-complete-build.log`. Next builds check the application/shared package types, and the server build runs TypeScript. Four standalone checks also passed in `/tmp/cruisin-workspace-preserved-typecheck.log` before the final notification panel accessibility adjustment.
- **Six operations browser cases passed**, desktop and mobile: `/tmp/cruisin-workspace-release-operations.log`. They cover independently reviewed tasks, theme and keyboard dialog controls, notification pagination/read actions (including updating the dashboard unread counter), failed-summary recovery, inventory/QR permissions, immutable QC evidence, packing, customer reservation and mocked shipment/handover.
- Focused employee workspace audit passed in `/tmp/cruisin-workspace-employee-audit.log`: permission-scoped values, module access, independent admin authentication, 375/390/768/1440 widths and WCAG 2 A/AA axe rules. The complete focused run below includes both admin and employee audits; automated checks do not establish universal accessibility compliance.
- Frontend Shiprocket secret scan passed across 245 built frontend files: `/tmp/cruisin-workspace-complete-secrets.log`.

Nine additional positively identified synthetic browser products created during workflow verification were hidden from public visibility after testing. Their records remain intact. The ignored reversal backup now retains 58 original visibility records, including the 49 from the preceding storefront pass. No production products were edited.

Screenshots under `docs/qa/screenshots`: `cruisin-v2-admin-workspace-{390,1440}.png`, `cruisin-v2-employee-workspace-{390,1440}.png`, `cruisin-v2-window-grid.png` and `cruisin-v2-glow-footer-{desktop,mobile}.png`. Existing storefront/CMS screenshots are refreshed by the focused acceptance suite.

The final focused suite passed **16/16 cases** in `/tmp/cruisin-workspace-success-browser.log`. Both dashboards pass the included axe WCAG 2 A/AA checks, support 375/390/768/1440 widths, use real API values and preserve independent portal authentication. Other cases verify persistent widget customization, module/shortcut links, animation pause controls, cursive identity, regular/window-grid persistence (four/ten dense columns), footer contacts and responsive layout, CMS preview/publication, store filters, gallery/cart/checkout behavior and reduced motion. Employee authentication tests register a fresh synthetic account per run rather than clearing or bypassing OTP cooldowns.

The final cross-browser suite passed **12/12 cases** in `/tmp/cruisin-workspace-release-crossbrowser.log`: desktop/mobile Chromium, Firefox and WebKit each validate storefront commerce, customer login errors and admin analytics. Combined with the 16 focused cases and six operations cases, this is **34 passing browser cases**, separate from the 661 unit/integration tests. Final screenshots were visually reviewed; the window-grid proof is captured after the finite view transition completes (`/tmp/cruisin-workspace-footer-proof.log`).
