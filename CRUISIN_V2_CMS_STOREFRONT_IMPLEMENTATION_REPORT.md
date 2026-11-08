# CRUISIN V2 CMS/storefront implementation report

Reference and motion follow-through, local V2 only. Branch `codex/cruisin-v2`.

## A. Executive summary
Implemented the reference-informed customer layout and a connected set of CMS presentation controls. Added smooth desktop scrolling and a shared motion layer, with native touch and live reduced-motion support. The full enterprise CMS master brief remains IN PROGRESS; incomplete scope is explicit below.

## B. Existing architecture reused
Existing CmsService, page/section/version models, admin builder, navigation/collection management, catalog queries, cart, PDP, checkout, media resolver and operations modules. No parallel CMS or copied product inventory.

## C. Admin CMS
Independent Home/Men/Women selection; constrained campaign/grid presets; actual storefront iframe preview; validated, origin-checked unsaved text/style updates; existing save, publish, reorder, duplicate, visibility and history controls. Product references hydrate on saved preview reload. The existing Storefront admin area retains navigation/collection ownership.

## D. Storefront
Compact calligraphic Cruisin header and direct mobile search; desktop side/mobile full-screen nested navigation with Back/Escape; full-bleed responsive campaign; restrained captions/actions; 5:7 cards; desktop four/mobile two columns; exact-variant quick-add bottom/right sheet; existing PDP and authoritative cart/checkout. The prior bottom app-style navigation was removed.

## E. Men/Women architecture
Independent published department content over the existing catalog. Reuses existing men/women/unisex eligibility and canonical product/SKU/price/stock. New tests ensure ineligible products are excluded and an eligible unisex unit retains the same identifiers and stock. A new eligibility/fit migration is not claimed complete.

## F. Field connectivity
Shared Zod runtime/TypeScript presentation contracts serve API, admin and renderer. See CMS_FIELD_CONSUMER_MAP.md for exact fields, storage and consumers. Actual unsaved preview and publish behavior is exercised against local APIs/MongoDB.

## G. Publishing and caches
Draft-only pages are private; empty published snapshots stay authoritative; invalid preview/time overrides fail. Dynamic delivery avoids the former homepage revalidation delay. Actual preview is no-store/noindex/no-referrer and accepts messages only from the configured admin origin and parent window. Preview analytics and promotions are suppressed. Multi-page atomic release, optimistic concurrency and durable scheduling remain unfinished.

## H. Responsive/visual QA
Farak desktop/mobile campaign, menu, catalog and quick-add composition were inspected. Cruisin uses its existing repository assets and wordmark; no Farak photography/artwork or source was copied. Browser tests check eight widths and capture desktop/mobile views. Browser emulation is not physical-device certification.

## I. TDD
Shared presentation tests initially failed because the new contract did not exist, then passed. The department test first failed on a fixture validation mistake; after fixing that fixture, the genuine RED showed two products instead of one, followed by GREEN on canonical department filtering. Motion preference unit tests were written before implementation. The real browser test exposed a live reduced-motion update issue, which was corrected with a subscribed media-query hook. Earlier publication RED→GREEN evidence remains in the prior record.

## J. Regression
Results are recorded in VERIFICATION_EVIDENCE.md after the final run. Earlier integration failures caused by changed card link structure and quick-add opening the existing cart were fixed by targeting the correct UI surfaces, without disabling business assertions. A real admin select ID/label issue was also corrected.

## K. Security
Constrained presentation presets and safe shortcut links; explicit server preview authorization; origin/source-checked preview messages; exact configured iframe origins; no cache/referrer/token logging; original API permissions and shared commerce authority retained. Preview capability expiry/revocation and comprehensive publication dependency validation remain master-brief gaps.

## L. Motion and performance
Lenis 1.3.27 drives desktop wheel interpolation over native coordinates, stops for body locks and preserves native modal/form scrolling. Touch/coarse pointers, preview, checkout and reduced-motion use native scrolling. Shop-route entrances, campaign image/caption reveal, card reveal/hover, menu and quick-add transitions share timing and easing. Live preference changes remove interpolation/movement. No hosted speed/frame-rate improvement is inferred from browser automation.

## M. Media
Existing V2 media abstraction and Cloudinary fallback retained. Existing Cruisin campaign files were configured through local CMS; the local catalog remains synthetic development data. No new photography/prices/manufacturing claims, source deletion or destructive migration.

## N. Outstanding master scope
Complete typed legacy section migration, independent fit/department eligibility backfill, atomic releases/CAS/scheduler, complete support/editorial page controls, broader SEO/redirect validation and analytics identities, full live provider/hardware and every-page acceptance remain unfinished. These are not silently marked complete by a new visual layout.

## O. Staging readiness
All work stays local. No remote push, production write, provider transaction, DNS change or hosted startup. Hosted services remain stopped as requested. Local links: storefront 3192, admin 3193/cms, employee 3194.

## Screenshot-based editor follow-up — 2026-11-08

Implemented the supplied three-column CRUISIN Storefront Editor reference in the existing admin application. It includes compact selectable/reorderable sections; Home/Men/Women pages; an actual desktop/mobile storefront canvas with zoom and selection; content/layout/visibility tabs; separate image upload controls; multiple safe CTA buttons; overlay strength; visibility, duplication/removal and version history; save status, preview and publish confirmation. Existing themes and permissions are retained. Responsive pane navigation replaces simultaneous columns on narrow screens.

A readiness handshake fixes initial canvas selection, and origin/window checks apply in both directions. Text/style saves update the shared preview without reloading its iframe. CMS media references in drafts and retained releases now block deletion. Restore updates draft content and leaves publication separate. New backend and browser checks cover these behaviors. Full evidence and limits are in `docs/cruisin-v2/cms-storefront/VERIFICATION_EVIDENCE.md`; usage details are in `STOREFRONT_EDITOR.md`.

## Photographic storefront follow-up — 2026-11-08

Applied the supplied collection/PDP reference layouts to the customer app: compact header, photographic grids, animated left filters with live counts, real sort controls, native swipe gallery and floating desktop purchase card, stock-bounded quantities, existing cart and checkout handoff. CMS campaign image/video/banner consumers remain active. The customer app now defaults to an independent light theme while operations apps retain their prior defaults. Local operations fixtures were hidden from public visibility without deleting their records; reversal data is retained in ignored backups. See `PHOTOGRAPHIC_STOREFRONT.md` and the verification evidence for scope, 661 automated and 25 browser checks.

## Glowing footer and shared workspaces — 2026-11-08

Researched the supplied Daylier design and official accessibility/interaction guidance, then built shared black admin and employee dashboards using actual existing API data. The requested Overview/Admin/Employee/Storefront navigation, module launcher, widget preferences, animated colored dock, ambient lighting and chart/table are implemented. Employee packing/exception signals, notification pagination/read actions and failure recovery remain connected; reading notifications updates the unread metric. The storefront has the restored cursive header, a persistent regular/dense window toggle and a rounded glowing footer with actual contacts, policies and pause controls. Details, sources and verification are in `docs/cruisin-v2/workspace/`.

## Dashboard restoration — 2026-11-08

At the user's explicit request, the new shared dashboard was removed and both admin and employee dashboards/shells were restored from commit `0b2457c`. The existing sidebar, admin KPI/chart overview, employee operational summary and notifications are back. Storefront layout, glowing footer, cursive header and window-grid toggle are retained. The earlier workspace design documentation/screenshots are historical.

Restoration verified: all four production builds passed (`/tmp/cruisin-restore-dashboards-build.log`); browser checks confirmed the original admin overview/sidebar and employee sidebar/operational summary/notifications, including a mobile overflow check. The retained footer/cursive-header/window-grid browser case passed (`/tmp/cruisin-restored-dashboard-storefront-check.log`). Current restored screenshots are `docs/qa/screenshots/cruisin-v2-{admin,employee}-dashboard-restored.png`.

## Full-width footer and theme follow-up — 2026-11-08

Refined the storefront footer to the supplied edge-to-edge reference: removed the outside gutter, added a full-width translucent Cruisin wordmark and layered lower-edge blur over the slow warm glow. Navigation and actual Cruisin contacts stay sharp; policies, theme selector, pause and back-to-top controls sit below the artwork. Light mode uses ivory/peach and dark text; dark mode uses charcoal/amber and light text. The smaller mobile wordmark has a separately positioned blur so its lettering remains visible. Existing restored admin/employee dashboards are unchanged.

The storefront production build passed (`/tmp/cruisin-footer-both-themes-build.log`). Browser verification switched the actual theme selector, checked full width and no horizontal overflow at 390/1440 pixels in both themes, checked the blur and reduced-motion behavior, and passed scoped WCAG 2 A/AA Axe checks (`/tmp/cruisin-footer-theme-verification.log`). Theme previews are `docs/qa/screenshots/cruisin-v2-footer-edge-{light,dark}-{390,1440}.png`. These are local browser checks, not physical-device certification. Hosted services remain stopped.
