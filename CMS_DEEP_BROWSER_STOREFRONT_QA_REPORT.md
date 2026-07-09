# CMS Deep Browser Storefront QA Report

Date: 2026-07-07

## Verdict

CMS deep browser QA is **mostly passed with one product gap**.

Passed:
- Admin login, CMS page load, storefront load, Mongo/API health, clean single dev stack.
- Draft sections stayed hidden from public storefront.
- Published sections appeared on the storefront and hydrated product references.
- Edit, duplicate, hide, restore, device visibility, media save, version restore, coupon apply, and cleanup were verified.
- All current CMS block categories were present in the admin block library: All, Hero, Products, Marketing, Editorial, Social, Utility, Recommended, Most Used, New.

Gap:
- Newsletter/Popup email forms render, but there is no newsletter subscription backend endpoint in the current app. The form is static, so invalid/valid email submission and duplicate email behavior cannot be marked pass.

## Fixes Made

- Improved CMS section inspector in `admin/components/cms/cms-builder.tsx`:
  - Grouped editor into Basic Info, Visibility & Scheduling, Content/Media/CTA, and Products/Categories/Collections.
  - Added searchable product, category, and collection selectors.
  - Product selector now saves section-level `products` references as well as legacy `content.productIds`, so storefront product rails hydrate correctly.
  - Collection selection fills collection metadata/CTA defaults when possible.

- Fixed storefront CMS rendering in `client/components/home/cms-homepage.tsx`:
  - `popup_campaign` now renders on storefront instead of returning `null`.
  - Product rails tolerate Mongo `_id` keys to avoid React key warnings.

- Fixed clean start seed reruns in `server/src/scripts/seed.ts`:
  - Seed now removes only archived stale products that conflict with canonical seed SKUs, preventing duplicate SKU failures without touching live products.

## Browser QA Evidence

Clean start:
- `npm install`: passed, 0 vulnerabilities.
- `npm run dev:db`: Mongo container running.
- `npm --workspace server run seed`: initially failed on archived duplicate SKU, fixed seed idempotency, rerun passed with 13 products.
- Existing stale dev listeners on 3000/3001/8000 were stopped; one clean `npm run dev` stack was started.
- API health: `{"status":"ok"}`.
- Dev servers: storefront 3000, admin 3001, API 8000.

Admin browser:
- Logged in with seeded admin.
- Opened `/cms`.
- Verified block library, templates, publish modal, live preview, version history, media manager, block search, quick filters, and searchable reference selectors.

Storefront browser:
- Created 20 QA CMS sections as drafts.
- Verified drafts did not appear on public storefront.
- Published from admin browser.
- Verified published content on storefront, including product titles/prices, CTA links, images, social proof, popup campaign, marquee, collection landing, and safe rendering of script-like text.
- Verified hide desktop and hide mobile at 1440px and 390px browser viewports.
- Verified restore from version history returned original QA state.
- Verified cleanup removed all `QA CMS` content from storefront.

## Block Coverage

Tested and verified:
- Announcement Bar
- Hero Campaign
- Limited Drop Timer
- Hot Drop
- Product Carousel
- Lookbook / Editorial Story
- Newsletter Section: renders, backend submission gap
- Trending Now
- Image Carousel
- Discount Banner
- Featured Collection / Collection Banner
- Single Video Landing
- Popup Campaign
- Brand Story
- Shop The Look
- Social Proof
- Best Sellers
- Marquee Strip
- Recently Viewed Products
- Fullscreen Collection Landing

## Backend/API Checks

- Public CMS draft visibility: 0 QA sections visible before publish.
- Public CMS after publish: 20 QA sections visible.
- Product-backed blocks hydrated selected products.
- Edit/publish: hero update appeared on storefront.
- Duplicate/publish: duplicate product carousel appeared.
- Hide/publish: announcement disappeared, then restored by version restore.
- Device flags: desktop/mobile hiding worked in browser.
- Media manager API saved QA media.
- Coupon `QACMSBANNER10` applied successfully to cart with discount.
- Cleanup: archived 20 QA sections, published cleaned homepage, archived QA coupon, removed cart test items.
- Final public CMS/storefront: 0 live `QA CMS` sections.

## Cleanup Status

Completed:
- QA CMS sections archived.
- Clean homepage republished.
- QA coupon archived.
- Cart test items removed.

Remaining intentional artifacts:
- CMS version history contains QA snapshots, as expected for version-history testing.
- Saved CMS media entry remains because no media delete/archive endpoint exists.

## Verification Commands

- `npm --workspace admin run typecheck`
- `npm --workspace client run typecheck`
- `npm --workspace server run typecheck`

All passed.
