# Cruisin workspaces, footer and window view

The shared workspace presentation is `packages/ui/src/workspace.tsx`, styled with scoped rules in `packages/ui/src/styles.css`. It is used by the admin overview and employee portal dashboard; existing management and operational modules keep their authenticated routes and existing workflows.

The dashboard contains the requested Overview, Admin, Employee and Storefront navigation, cursive branding, black rounded panels, amber/blue/mint/rose metric lighting, an actual-data bar chart with an accessible data table, work queue, module launcher, account menu and colored shortcut dock. Customize controls metric visibility; choices persist separately for admin and employee in browser storage. Refresh reads the existing APIs again. Pause stops continuous ambient motion. System reduced-motion removes the entrance and decorative motion.

Admin metrics use `/admin/overview`, `/admin/analytics` and `/admin/orders`. Recent order links open actual order details. Product totals describe active catalog records, which may include records hidden from the public storefront. The employee dashboard uses its existing permission-scoped `/employee/summary` and task list. Inventory widgets/series appear only for principals with inventory permission. Completed/cancelled tasks are excluded from the work-in-motion list. No reference-design focus scores, employee time tracking or invented task percentages are displayed. Each portal retains separate authentication; navigation never transfers tokens between apps.

All original modules remain reachable from the launcher. Employee module links use the existing permission filter. Choosing the Admin portal from an employee session still requires admin authentication. Customization changes browser presentation preferences only.

The storefront window button switches regular cards (two columns on mobile, four by default on desktop) to a photographic contact sheet (four/ten columns). It preserves filters, sort and product links and stores the view choice locally. Native View Transitions supplies a crossfade where supported; the fallback remains functional and reduced-motion skips it. The custom vector window is native code, not a copied Farak asset. The original cursive header font is restored.

The footer uses an inset rounded black panel, oversized cursive Cruisin mark, slowly moving warm gradient, actual support/social links and retained store policies. It has pause/play and back-to-top controls. The policy strip has its own dark surface to keep text readable over the glow.

Local URLs: storefront 3192, admin 3193, employee 3194. Hosted services remain stopped. Research sources and interpretation are in `DESIGN_RESEARCH.md`; verification and screenshots are in `VERIFICATION.md`.

The employee dashboard also retains its operational signals (overdue work, exceptions and permitted packing/packed/handover counts) and the original paginated notifications widget. Notification read actions refresh the unread metric without resetting the current notification page. The notification panel supports keyboard scrolling. Dashboard refresh reloads summary, tasks and notifications, displays network failures and recovers on retry; failed summary data is shown as unavailable rather than invented zeros.
