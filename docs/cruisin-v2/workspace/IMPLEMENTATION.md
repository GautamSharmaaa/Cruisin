# Cruisin workspaces, footer and window view

> Dashboard design withdrawn at the user’s request on 2026-11-08. The previous admin and employee dashboards are restored. Footer, cursive storefront branding and window-grid changes remain. Dashboard descriptions/screenshots below are historical.

The shared workspace presentation is `packages/ui/src/workspace.tsx`, styled with scoped rules in `packages/ui/src/styles.css`. It is used by the admin overview and employee portal dashboard; existing management and operational modules keep their authenticated routes and existing workflows.

The dashboard contains the requested Overview, Admin, Employee and Storefront navigation, cursive branding, black rounded panels, amber/blue/mint/rose metric lighting, an actual-data bar chart with an accessible data table, work queue, module launcher, account menu and colored shortcut dock. Customize controls metric visibility; choices persist separately for admin and employee in browser storage. Refresh reads the existing APIs again. Pause stops continuous ambient motion. System reduced-motion removes the entrance and decorative motion.

Admin metrics use `/admin/overview`, `/admin/analytics` and `/admin/orders`. Recent order links open actual order details. Product totals describe active catalog records, which may include records hidden from the public storefront. The employee dashboard uses its existing permission-scoped `/employee/summary` and task list. Inventory widgets/series appear only for principals with inventory permission. Completed/cancelled tasks are excluded from the work-in-motion list. No reference-design focus scores, employee time tracking or invented task percentages are displayed. Each portal retains separate authentication; navigation never transfers tokens between apps.

All original modules remain reachable from the launcher. Employee module links use the existing permission filter. Choosing the Admin portal from an employee session still requires admin authentication. Customization changes browser presentation preferences only.

The storefront window button switches regular cards (two columns on mobile, four by default on desktop) to a photographic contact sheet (four/ten columns). It preserves filters, sort and product links and stores the view choice locally. Native View Transitions supplies a crossfade where supported; the fallback remains functional and reduced-motion skips it. The custom vector window is native code, not a copied Farak asset. The original cursive header font is restored.

The footer now blends edge to edge into the exact storefront background, with no rounded panel or separate grey/ivory base. The oversized cursive Cruisin signature, slowly moving warm gradient, live wave and blur share a decorative layer that fades to transparency at both edges, including the legal strip seam. The header retains its cursive identity. Light mode uses the white page surface with orange light and dark text; dark mode uses the black page surface with orange light and pale text. Email, Instagram and Facebook remain above the artwork; the footer phone number and WhatsApp link have been removed. Retained policies, theme selector, pause/play and back-to-top controls sit in a separate theme-aware strip below it. The mobile wordmark is a large, slightly angled cursive signature with stronger theme-specific colour above the lower fade. Current theme previews are `docs/qa/screenshots/cruisin-v2-footer-edge-{light,dark}-{390,1440}.png`; older footer screenshots below are historical.

Local URLs: storefront 3192, admin 3193, employee 3194. Hosted services remain stopped. Research sources and interpretation are in `DESIGN_RESEARCH.md`; verification and screenshots are in `VERIFICATION.md`.

The employee dashboard also retains its operational signals (overdue work, exceptions and permitted packing/packed/handover counts) and the original paginated notifications widget. Notification read actions refresh the unread metric without resetting the current notification page. The notification panel supports keyboard scrolling. Dashboard refresh reloads summary, tasks and notifications, displays network failures and recovers on retry; failed summary data is shown as unavailable rather than invented zeros.

The current footer also has a living wave in `client/components/layout/footer-wave.tsx`: three blurred SVG light layers with irregular sinusoidal geometry and gentle mouse response. Colors adapt to the active theme; speed/amplitude/easing live in `client/lib/animations.ts`. Pause freezes geometry; reduced motion, offscreen visibility and background-tab state suspend animation. No per-frame React state updates. Current wave previews use `cruisin-v2-footer-wave-{light,dark}-{390,1440}.png` in the QA screenshot directory.

Current seamless footer previews are `docs/qa/screenshots/cruisin-v2-seamless-footer-{light,dark}-{390,1440}.png`. Older inset/rounded footer previews are historical.

Latest contact/branding previews: `docs/qa/screenshots/cruisin-v2-footer-brand-{light,dark}-{390,1440}.png`.

Latest orange-wave/cursive previews: `docs/qa/screenshots/cruisin-v2-footer-orange-signature-{light,dark}-{390,1440}.png`.
