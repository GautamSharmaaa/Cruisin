# Cruisin Final Interaction Inventory

Status: **complete** on 13 July 2026. `M` means exercised manually in the in-app
Browser, `A` means covered by the final Playwright suite, and `I` means the
rendered result, API response, database state, or source path was also inspected.

Every storefront route below was opened manually at desktop, tablet, and mobile
classes. The highest-risk routes were additionally checked at 1440, 1280, 1024,
768, 430, 390, and 360 CSS pixels. All fourteen Admin routes were checked on
desktop and mobile, with Analytics, catalogue, variant editing, and dense tables
also checked at tablet width.

## Storefront routes (34/34)

| # | Route | Principal controls and states exercised | Desktop | Tablet | Mobile |
|---:|---|---|---|---|---|
| 1 | `/` | header, menus, search, CMS sections, product cards, footer | M+A+I | M+A | M+A |
| 2 | `/shop` | facets, combined filters, sort, reset, cards, pagination/loading | M+A+I | M+A | M+A |
| 3 | `/shop/[slug]` | contextual listing, facets, product navigation | M+A | M | M |
| 4 | `/category/[...slug]` | nested category listing and recovery | M+A | M | M |
| 5 | `/collections` | published collection cards and navigation | M+A+I | M | M |
| 6 | `/collections/[slug]` | collection listing, filter/sort, product navigation | M+A | M | M |
| 7 | `/product/[slug]` | gallery, HEX colors, color-scoped sizes, stock, SKU, cart, wishlist | M+A+I | M+A | M+A |
| 8 | `/cart` | exact variants, quantity, remove, coupon apply/remove, checkout | M+A+I | M+A | M+A |
| 9 | `/checkout` | guest guard, address, shipping, COD, exact summary, validation | M+A+I | M+A | M+A |
| 10 | `/checkout/success` | order confirmation and next actions | M+A+I | M | M |
| 11 | `/checkout/failure` | failure explanation, retry, and recovery navigation | M+A | M | M |
| 12 | `/login` | validation, sign-in, redirects, cart merge, failure state | M+A+I | M | M+A |
| 13 | `/register` | validation, account creation, login handoff | M+A+I | M | M+A |
| 14 | `/forgot-password` | validation and provider-safe response | M+A | M | M |
| 15 | `/reset-password` | invalid/missing token state and navigation | M+A | M | M |
| 16 | `/verify-email` | invalid/missing token state and navigation | M+A | M | M |
| 17 | `/account` | profile summary, navigation, update and logout | M+A+I | M | M+A |
| 18 | `/account/addresses` | add, edit, update, default and validation | M+A+I | M | M+A |
| 19 | `/account/orders` | list, status, totals and detail navigation | M+A+I | M | M+A |
| 20 | `/account/orders/[id]` | exact variant lines, totals, status and cross-account denial | M+A+I | M | M+A |
| 21 | `/account/wishlist` | authenticated state, removal and product navigation | M+A+I | M | M+A |
| 22 | `/account/notifications` | current preference controls and empty state | M+I | M | M |
| 23 | `/account/preferences` | persisted preference controls | M+I | M | M |
| 24 | `/account/security` | account deletion confirmation and available security controls | M+A+I | M | M+A |
| 25 | `/men` | configured landing/listing behavior | M+A | M | M |
| 26 | `/women` | configured landing/listing behavior | M+A | M | M |
| 27 | `/sale` | sale listing and empty/configured states | M+A | M | M |
| 28 | `/new-featured` | configured listing and product navigation | M+A | M | M |
| 29 | `/about-us` | content, layout and global navigation | M+A | M | M |
| 30 | `/privacy-policy` | legal content, typography and navigation | M+A | M | M |
| 31 | `/return-policy` | legal content, typography and navigation | M+A | M | M |
| 32 | `/shipping-policy` | legal content, typography and navigation | M+A | M | M |
| 33 | `/terms-and-condition` | legal content, typography and navigation | M+A | M | M |
| 34 | unknown route / 404 boundary | branded not-found state and recovery CTA | M+A+I | M | M+A |

## Admin routes (14/14)

| # | Route | Principal controls and states exercised | Desktop | Tablet | Mobile |
|---:|---|---|---|---|---|
| 1 | `/login` | validation, authentication and redirect | M+A+I | M | M |
| 2 | `/` | overview KPIs, shortcuts, table/card layout | M+A+I | M | M+A |
| 3 | `/products` | search, filters, pagination, edit and archive modal | M+A+I | M | M+A |
| 4 | `/products/new` | all fields, media, category, colors, variant matrix, validation | M+A+I | M | M+A |
| 5 | `/products/[id]` | variant add/remove/edit, duplicate validation, persistence | M+A+I | M | M+A |
| 6 | `/catalogues` | template/export, upload flow, preview, confirm and history | M+A+I | M+A | M+A |
| 7 | `/categories` | category CRUD, activation/archive and confirmation | M+A+I | M | M+A |
| 8 | `/storefront` | all tabs, collections, filters, menus and settings CRUD | M+A+I | M | M+A |
| 9 | `/orders` | search by exact variant, filters, totals and detail navigation | M+A+I | M | M+A |
| 10 | `/orders/[id]` | exact items/SKUs, payment labels, status and refund views | M+A+I | M | M+A |
| 11 | `/users` | search, customer state and account data | M+A+I | M | M+A |
| 12 | `/discounts` | targeted coupon CRUD, activate/archive and validation | M+A+I | M | M+A |
| 13 | `/cms` | section edit, preview, draft, publish and live storefront reflection | M+A+I | M | M+A |
| 14 | `/analytics` | ranges, refresh, export, KPI help, charts and tables | M+A+I | M+A+I | M+A+I |

## End-to-end journeys

The manual sweep covered guest search/filter/PDP/cart prompts; registration,
login, return routes and cart merge; wishlist and address/profile flows; a
targeted coupon in valid, invalid, removed and archived states; exact-variant
COD checkout and customer/Admin order inspection; Admin product/taxonomy/
collection/filter/discount/CMS CRUD; valid, invalid, legacy and round-trip
catalogues; Analytics range/export/reconciliation; authorization failures; and
the final QA cleanup.

## Interaction totals and exclusions

- **164 named control or journey groups manually passed; 0 final failures.** This
  is a conservative group count, not a claim that every repeated card or row is
  a distinct interaction.
- **55 Playwright cases:** 52 passed, 3 intentional conditional skips, 0 failed.
- The three skips are unpublished newsletter, unpublished recently-viewed, and
  the desktop project's mobile-menu case; the menu is covered in the mobile
  project.
- Native Browser file-input population is **B (harness limitation)**. The same
  catalogue upload control was visually inspected, and its real multipart path
  was completed through API and Playwright `setInputFiles`.
- Newsletter, recently viewed, and a dedicated password-change form are **NA**
  because those experiences are not published in this build.
- Final public Razorpay webhook delivery is **out of local scope** and remains
  `EXT-WEB-001`, a release gate rather than an application test failure.
