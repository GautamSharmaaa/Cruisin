# CMS Real Product Homepage Integration QA Report

Date: 2026-07-07

## 1. Executive Summary

Real product homepage readiness: 92%.

The live CMS homepage was rebuilt with real active Cruisin products, real collections, realistic luxury streetwear copy, a real coupon, a working newsletter backend, popup campaign behavior, countdown edge handling, and recently viewed homepage personalization.

What changed:
- Published 16 production-like CMS homepage sections using real products and real collections.
- Added `CMSHOME10` as a real 10% selected-product coupon with max discount cap.
- Implemented newsletter subscribe backend and connected homepage/popup forms.
- Implemented live countdown rendering with future, past, and invalid-date safe states.
- Implemented homepage recently viewed rail from real PDP visits.
- Hardened public CMS product hydration to exclude hidden/draft/archived products and admin-only fields.
- Fixed cart coupon sync, empty-cart API fallback, countdown hydration mismatch, and mobile popup layering.

What remains:
- Full checkout/order coupon analytics was not completed because no dev payment/order was placed.
- Admin subscriber management view was not added.
- The broad pre-existing `npm run test:e2e` suite still has unrelated legacy failures in auth/catalogues/browser smoke specs. The new focused CMS real homepage E2E spec passes on desktop and mobile.

## 2. Real Product Selection Table

| Usage | Product/Collection | SKU/Slug | Public? | Used In CMS Block | Storefront Verified |
|---|---|---|---|---|---|
| Hero / sale / countdown | Void Drape Hoodie | `CR-VDH-BLK-S` / `void-drape-hoodie` | Yes | Hero, Limited Drop, The Drop, Black Transit, Recently Viewed | Yes |
| Hero / sale / carousel | Minimalist Heavyweight Tee | `CR-MHT-WHT-XS` / `minimalist-heavyweight-tee` | Yes | Hero, Limited Drop, The Drop, Black Transit | Yes |
| Featured / bestseller | Signal Cargo Trouser | `CR-SCT-CBN-30` / `signal-cargo-trouser` | Yes | Black Transit, Trending Now, Shop The Look, Best Sellers | Yes |
| Featured / bestseller | Apex Utility Jogger | `CR-AUJ-BLK-S` / `apex-utility-jogger` | Yes | Black Transit, Trending Now, Best Sellers | Yes |
| Trending / bestseller | Cyber Cargo Pants | `CR-CCP-SAG-30` / `cyber-cargo-pants` | Yes | Trending Now, Best Sellers | Yes |
| Sale / bestseller | Phantom Windbreaker | `CR-PWB-CHA-XS` / `phantom-windbreaker` | Yes | Limited Drop, Trending Now, Shop The Look, Best Sellers | Yes |
| New arrival | Oversized Knit Cardigan | `CR-OKC-OAT-S` / `oversized-knit-cardigan` | Yes | The Drop, Lookbook | Yes |
| New arrival | Monolith Overshirt | `CR-MO-OBS-S` / `monolith-overshirt` | Yes | The Drop, Lookbook | Yes |
| Sale / countdown | Transit Tech Shorts | `CR-TTS-GRY-S` / `transit-tech-shorts` | Yes | Limited Drop coupon eligibility | API/cart verified |
| Real collection | Black Transit | `black-transit` | Yes | Featured Collection, Hero CTA | Yes |
| Real collection | Quiet Uniform | `quiet-uniform` | Yes | Image Carousel | Yes |
| Real collection | Winter Collection | `winter-collection` | Yes | Lookbook CTA | Yes |
| Real collection | Racing Club | `racing-club` | Yes | Image Carousel | Yes |

Selected real categories: Outerwear, Tops, Bottoms.

## 3. CMS Product-Linked Block Evidence

| CMS Block | Real Products Used | Real Collection Used | Published | Storefront Verified | PDP Click Tested | Cart Tested | Status |
|---|---|---|---|---|---|---|---|
| Limited Drop / Countdown | Void, Minimalist Tee, Phantom, Transit Shorts | Black Transit CTA | Yes | Yes | Yes | Yes | Pass |
| Product Carousel / The Drop | Void, Minimalist Tee, Cardigan, Monolith | None | Yes | Yes | Yes | Yes | Pass |
| Featured Collection | Signal, Apex, Void, Minimalist Tee | Black Transit | Yes | Yes | Yes | Yes | Pass |
| Trending Now | Signal, Apex, Cyber Cargo, Phantom | None | Yes | Yes | Yes | Yes | Pass |
| Shop The Look | Phantom, Signal | None | Yes | Yes | Yes | Yes | Pass |
| Best Sellers | Signal, Apex, Cyber Cargo, Phantom | None | Yes | Yes | Yes | Yes | Pass |
| Discount Banner | Coupon applies to Void, Minimalist Tee, Phantom, Transit Shorts | Sale CTA | Yes | Yes | Yes | Yes | Pass |
| Recently Viewed | Local real PDP visit products | None | Yes | Yes | Yes | N/A | Pass |

## 4. Countdown Evidence

- Future date: `2026-07-12T17:55` restored; storefront showed days/hours/minutes/seconds, no `NaN`.
- Past date: API-patched section to one hour in the past; storefront showed `This drop window has ended.` with zeroed units.
- Invalid date: API-patched `endDateTime: "invalid-date"`; storefront kept all 16 sections and showed `Drop timing is being updated.` with dash units.
- Hydration: fixed server/client countdown mismatch by rendering stable dash units until client time is ready.
- Desktop/mobile: focused E2E passed on Chromium desktop and mobile projects.

## 5. Coupon / Discount Banner Evidence

Coupon: `CMSHOME10`.

Rules verified:
- Type: percentage.
- Value: 10%.
- Min order: Rs. 999.
- Max discount: Rs. 1,000.
- Eligible products include Void Drape Hoodie, Minimalist Tee, Phantom Windbreaker, Transit Tech Shorts.

API/cart proof:
- Eligible cart with Void Drape Hoodie: status 200, discount Rs. 1,000, eligible subtotal Rs. 18,900.
- Ineligible cart with Signal Cargo Trouser only: status 400, message `Coupon does not apply to items in this cart`.
- UI proof: PDP -> size S -> Add To Cart -> cart drawer -> apply `CMSHOME10` -> `CMSHOME10 applied`, `-₹1,000`.

Checkout/order analytics: not completed because no dev payment/order was placed.

## 6. Newsletter Evidence

Backend implemented:
- Model: `NewsletterSubscriber`.
- Endpoint: `POST /api/v1/newsletter/subscribe`.
- Fields: email, source, consent, user agent, IP hash, timestamps.
- Validation: invalid emails rejected; duplicate email returns friendly success.

Browser proof:
- Invalid `not-an-email`: native email validation blocked submit and no success message appeared.
- Valid generated address: `You are on the list.`
- Duplicate same address: `You are already on the list.`

## 7. Storefront Homepage Final Evidence

Verified:
- No visible QA/test labels on final homepage.
- No placeholder/lorem/sample copy.
- Real sections visible: announcement, hero, countdown, The Drop, featured collection, trending, shop the look, best sellers, lookbook, image carousel, discount banner, newsletter, social proof, marquee, popup, recently viewed.
- Product links use `/product/[slug]`.
- Collection links use real collection routes.
- Product images and prices render.
- Sale compare prices render.
- No countdown `NaN`.
- No unsafe `javascript:` links found.
- Browser default desktop had no horizontal overflow.
- Responsive sweep covered 320, 375, 390, 414, 768, 1024, 1440 with no overflow after rechecks.

## 8. Admin CMS UX Changes

Verified admin `/cms` after login:
- CMS Builder shell loads at 1440 and 390.
- Product picker/search hints and product/SKU card evidence present.
- Collection picker/search hints present.
- Publish and preview/storefront controls present.
- No horizontal overflow at 1440 or 390 in the quick admin check.

The picker UX improvements were already present in the working tree from the previous CMS QA work and were verified rather than rebuilt in this pass.

## 9. Responsive Evidence

Storefront browser sweep:
- 320: pass
- 375: pass after fresh load
- 390: pass after fresh load
- 414: pass
- 768: pass
- 1024: pass
- 1440: pass

Mobile issues found and fixed:
- Popup close button was blocked by fixed header on mobile. Fixed by raising popup layer and positioning the modal below the header on small screens.

## 10. Security Evidence

| Check | Result |
|---|---|
| Public CMS API excludes `costPrice` | Pass |
| Public CMS API excludes catalogue internals | Pass |
| Product detail/list excludes cost/catalogue internals | Pass |
| Hidden product does not appear in CMS product rails | Pass |
| Hidden product public PDP returns 404 | Pass |
| Hidden product restored and republished | Pass |
| Invalid CTA link safety | `safeHref` falls back to safe local route |
| Countdown invalid date safe | Pass |
| Newsletter email validation | Pass |
| Coupon cannot apply to ineligible cart | Pass |

Hidden product proof:
- Temporarily hid `Apex Utility Jogger`.
- Public PDP returned 404.
- Republished CMS.
- Public CMS product arrays did not include Apex.
- Restored product visibility and republished.

## 11. Bugs Found And Fixed

| ID | Bug | Root Cause | Fix | Browser Retest |
|---|---|---|---|---|
| CMS-REAL-01 | Countdown hydration mismatch | Server rendered seconds changed before client hydration | Render stable dash units until client time initializes | Pass |
| CMS-REAL-02 | CMS public API exposed catalogue internals | Snapshot hydration queried full product docs | Added public projection for CMS hydration/populate | Pass |
| CMS-REAL-03 | Hidden products could remain in CMS rails | CMS snapshot hydration only excluded archived products | Filter active, published, visible, non-archived products | Pass |
| CMS-REAL-04 | Cart coupon sync emitted intentional 404 | UI tried PUT before POST for unsynced client cart | Read server cart first and choose POST/PUT | Pass |
| CMS-REAL-05 | Empty anonymous cart returned null | Missing `await` prevented empty-cart fallback | Await cart query and return `{ items: [] }` | Pass |
| CMS-REAL-06 | Newsletter section had no backend | Form had no API endpoint | Added model, validator, service, controller, route | Pass |
| CMS-REAL-07 | Mobile popup close blocked | Fixed header overlapped popup close | Raised/offset popup on mobile | Pass |

## 12. Files Changed

Primary files changed in this pass:
- `client/components/home/cms-homepage.tsx`
- `client/components/product/product-page-client.tsx`
- `client/components/cart/coupon-input.tsx`
- `client/e2e/cms-real-homepage.spec.ts`
- `server/src/models/newsletter-subscriber.model.ts`
- `server/src/validators/newsletter.validator.ts`
- `server/src/services/newsletter.service.ts`
- `server/src/controllers/newsletter.controller.ts`
- `server/src/routes/v1/newsletter.routes.ts`
- `server/src/routes/v1/index.ts`
- `server/src/services/cms.service.ts`
- `server/src/services/cart.service.ts`

Also created:
- `CMS_REAL_PRODUCT_HOMEPAGE_INTEGRATION_QA_REPORT.md`

## 13. Commands Run

Passed:
- `npm install`
- `npm run dev:db`
- `npm --workspace server run seed`
- `npm --workspace server run typecheck`
- `npm --workspace client run typecheck`
- `npm --workspace admin run typecheck`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm --workspace client run test:e2e -- cms-real-homepage.spec.ts --project=chromium`
- `npm --workspace client run test:e2e -- cms-real-homepage.spec.ts --project=mobile-chromium`
- `npm --workspace client run test:e2e -- cms-real-homepage.spec.ts`

Full-suite caveat:
- `npm run test:e2e` was run and failed in older existing suites: auth expectations, catalogue admin login/url expectations, and legacy browser QA smoke tests. During one run, running `npm run build` while dev servers were alive also produced stale Next dev manifests; generated `.next` output was cleaned and the focused CMS E2E suite was rerun successfully.

## 14. E2E Tests Added

Added `client/e2e/cms-real-homepage.spec.ts`:
- Public CMS API returns production sections and safe product payloads.
- Homepage renders real CMS sections/products with no QA copy.
- PDP from CMS product supports variant selection, cart drawer, and `CMSHOME10`.
- Newsletter validates invalid email, valid subscribe, duplicate subscribe.
- Recently viewed rail populates from real PDP visit.

Result: 10/10 passed across desktop Chromium and mobile Chromium.

## 15. Cleanup / Final Homepage State

Final published homepage sections:
1. Announcement Bar
2. Hero Campaign
3. Limited Drop Timer
4. Product Carousel / The Drop
5. Featured Collection / Black Transit
6. Trending Now
7. Shop The Look
8. Best Sellers
9. Drop Notes / Lookbook
10. Image Carousel
11. Discount Banner
12. Newsletter
13. Social Proof
14. Marquee Strip
15. Recently Viewed
16. Popup Campaign

Final checklist:
- Real products linked in CMS: Pass
- Real collections linked in CMS: Pass
- Countdown tested: Pass
- Product carousel tested: Pass
- Trending tested: Pass
- Best sellers tested: Pass
- Shop The Look tested: Pass
- Discount banner tested: Pass
- Newsletter handled: Pass
- Popup tested: Pass
- Recently viewed tested: Pass
- Product PDP links tested: Pass
- Cart tested: Pass
- Coupon tested: Pass
- Storefront verified: Pass
- Mobile verified: Pass
- Desktop verified: Pass
- No QA/test labels visible: Pass
- Typecheck passed: Pass
- Lint passed: Pass
- Build passed: Pass
- Unit tests passed: Pass
- Focused CMS E2E passed: Pass
- Full legacy E2E suite: Fails outside this CMS-focused spec; see command notes.
