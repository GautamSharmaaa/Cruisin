# Cruisin Manual QA Audit Report

Date: 2026-07-01

## Environment

| Item | Result | Notes |
| ---- | ------ | ----- |
| MongoDB | Pass | Started with `npm run dev:db`; seed script connected successfully. |
| Backend API `http://localhost:8000` | Pass | `/health` returned 200; invalid API routes returned controlled JSON errors. |
| Storefront `http://localhost:3000` | Pass | Opened in browser; homepage, listings, PDP, cart, search, menus, and mobile states rendered. |
| Admin `http://localhost:3001` | Pass | Login and major dashboard pages loaded in browser with seeded admin user. |
| Client API base URL | Pass | Storefront calls reached backend without CORS failures during browser flows. |
| Admin API base URL | Pass | Admin login and dashboard resource calls reached backend. |
| CORS | Pass | No browser CORS blocks observed during tested storefront/admin flows. |

## Commands Run

| Command | Result | Notes |
| ------- | ------ | ----- |
| `npm install` | Pass with warning | Install completed; `npm audit` still reports 1 high severity vulnerability. |
| `npm run dev:db` | Pass | Docker MongoDB service available. |
| `npm --workspace server run seed` | Pass | Seeded products, merchandising, and admin `admin@cruisin.local`. |
| `npm run dev` | Pass | Started backend, storefront, and admin for manual browser QA. |
| `curl http://localhost:8000/health` | Pass | Backend health check returned 200. |
| `curl http://localhost:8000/api/v1/admin/products` | Pass | Unauthenticated request returned 401. |
| `curl http://localhost:8000/api/v1/admin/navigation` | Pass | Unauthenticated request returned 401. |
| `curl http://localhost:8000/api/v1/products/not-a-real-product` | Pass | Invalid product slug returned 404. |
| `curl http://localhost:8000/api/v1/categories/by-path/../../etc/passwd` | Pass | Malformed category path returned a controlled 404. |
| `npm run typecheck` | Pass | Root workspace typecheck completed. |
| `npm run lint` | Pass | Root workspace lint completed. |
| `npm run build` | Pass | Client, admin, and server builds completed. |
| `npm run test` | Pass | Server: 9 tests passed; client: 2 tests passed. |
| `npm run test:e2e` | Pass | 20 passed, 4 skipped after clearing stale Next `.next` caches and stopping duplicate dev servers. |

## Manual QA Checklist

| Area | Page/Route | Button/Link/Form Tested | Expected Result | Actual Result | Status | Screenshot Path | Console Error | Network Error | Files Changed |
| ---- | ---------- | ----------------------- | --------------- | ------------- | ------ | --------------- | ------------- | ------------- | ------------- |
| Environment | App stack | Startup, seed, health, browser load | All services start and render | Services started; pages rendered | Pass | N/A | None blocking | None blocking | N/A |
| Homepage/header | `/` | Logo, nav triggers, search, profile, wishlist, cart | Interactive header with no blank screen | Header worked on desktop/mobile | Pass | N/A | None blocking | None blocking | N/A |
| Desktop menu | `/` at desktop widths | New & Featured, Men, Women, Sale, Collections, close, ESC, route-change close | Full-screen menu opens, routes close menu, Collections contains only collection cards | Behavior matched expected state; no Shop/Jordan references observed | Pass | N/A | None blocking | None blocking | N/A |
| Desktop menu links | Menu-generated routes | 83 unique menu URLs swept in browser | Links route without overflow or broken layout | Routes loaded; later category lookup 404 noise fixed | Fixed | N/A | None blocking after fix | Category by-path 404s fixed | `client/hooks/useCategories.ts`, `client/lib/storefront-server.ts` |
| Mobile menu | 360, 390, 430, 768, 1024 widths | Hamburger, close, accordions, collection card tap, cart/search controls | Drawer usable, body locked, no overflow | Passed at mobile widths; 1024 correctly used desktop menu behavior | Pass | N/A | None blocking | None blocking | N/A |
| Search | Header/modal | Open, close, query, result click, no-result query, special chars, Enter submit | Results navigate to PDP; no-result state is clear; Enter routes to shop search | Initial result click and no-result UX were weak; fixed and retested | Fixed | N/A | None blocking | None blocking | `client/components/shared/search-modal.tsx` |
| Product listing | `/shop`, menu/category routes | Filters, advanced drawer, sort, grid buttons, wishlist, quick add, product links | Controls usable and product cards route/add | Passed; above-fold image priority tuned to remove LCP warnings | Fixed | N/A | LCP image warning addressed | None blocking | `client/components/shop/product-card.tsx`, `client/components/shop/product-grid.tsx` |
| Category/subcategory | `/new-featured`, `/men`, `/women`, `/sale`, category links | Page load, empty/product states, filters, grid, product links | Clean listing pages without broken API calls | Category lookup now uses existing categories instead of noisy by-path calls | Fixed | N/A | None blocking after fix | 404 by-path noise fixed | `client/hooks/useCategories.ts`, `client/lib/storefront-server.ts` |
| Collections | `/collections`, `/collections/quiet-uniform` and menu cards | Collection card images, tap/click, detail page, listing controls | Cards and detail pages load; hidden cards not surfaced in tested menu | Passed representative collection flow | Pass | N/A | None blocking | None blocking | N/A |
| PDP | `/product/minimalist-heavyweight-tee` | Gallery, size select, add to cart, wishlist, accordions/visible sections | Variant selection affects cart; wishlist graceful for guests | Add to cart passed; guest wishlist API 401 fixed | Fixed | N/A | None blocking after fix | Guest wishlist 401 fixed | `client/components/product/wishlist-button.tsx` |
| Cart | Drawer | Add from card, add from PDP, quantity +/-, remove added item, totals, checkout button visibility | Count/totals update and drawer remains usable | Passed; pre-existing cart item was preserved | Pass | N/A | None blocking | None blocking | N/A |
| Wishlist | Header/card/PDP | Guest toggle, badge, wishlist route | Guest wishlist should not spam protected API | Local guest toggle now avoids unauthenticated API call; protected wishlist page redirects to login | Fixed | N/A | None blocking after fix | 401 noise fixed | `client/components/product/wishlist-button.tsx` |
| Auth/profile | Storefront auth entry | Sign-in/protected wishlist redirect | Protected page should redirect cleanly | Wishlist redirected to `/login?next=%2Faccount%2Fwishlist` | Pass | N/A | None blocking | None blocking | N/A |
| Checkout/order | Cart drawer | Checkout CTA visibility | CTA available; no live payment used | Checkout/payment was not completed because sandbox payment credentials were not exercised | Needs Work | N/A | Not fully checked | Not fully checked | N/A |
| Footer/static | Footer/static route set | Footer links and static routes smoke checked | Static routes load without obvious broken layout | Smoke pass only; not every footer/social action was individually clicked | Needs Deeper Pass | N/A | None blocking in smoke | None blocking in smoke | N/A |
| Admin login | `/login` | Invalid login, valid login | Invalid credentials show error; valid admin reaches dashboard | Passed with seeded admin credentials | Pass | N/A | None blocking | None blocking | N/A |
| Admin dashboard | `/`, `/products`, `/categories`, `/storefront`, `/orders`, `/users`, `/discounts`, `/cms`, `/analytics` | Sidebar navigation, page load, visible tables/forms/actions | Major admin pages render and are usable | Browser smoke passed; exhaustive CRUD was not fully manual-tested | Needs Deeper Pass | N/A | None blocking | None blocking | N/A |
| Admin-to-storefront | E2E spec | Temporary admin data reflection and cleanup | Safe temp data appears on storefront and is cleaned up | Passed in desktop E2E; skipped in mobile project | Pass | N/A | None blocking | None blocking | `client/e2e/cruisin-browser-qa.spec.ts` already present |
| Security | API probes | Admin APIs without token, invalid slugs, malformed category path | 401/404 controlled responses; no crash | Passed tested probes | Pass | N/A | N/A | Controlled 401/404 only | N/A |
| Responsive | 1440, 1280, 1024, 768, 430, 390, 360 | Homepage, nav, menu, listings, PDP, cart/search representative flows | No horizontal overflow, controls usable | Passed representative browser and E2E checks | Pass | N/A | None blocking | None blocking | N/A |

## Bugs Found And Fixes

| ID | Area | Reproduction | Root Cause | Fix | Retest Result | Files Changed |
| -- | ---- | ------------ | ---------- | --- | ------------- | ------------- |
| QA-001 | Search result navigation | Open search, query `cargo`, click `Minimalist Heavyweight Tee`; modal closed but route could remain on listing context. | Result row was a nested interactive `Link` path inside modal behavior that did not reliably push before close. | Added explicit `router.push` navigation and modal close helper. | Browser retest opened `/product/minimalist-heavyweight-tee` and closed modal. | `client/components/shared/search-modal.tsx` |
| QA-002 | Search empty state | Search `zzzx-no-results-!@#`; modal showed an empty body. | No explicit no-results branch for non-loading empty result sets. | Added accessible no-results state. | Browser retest showed `No products found.` | `client/components/shared/search-modal.tsx` |
| QA-003 | Search Enter key | Type a query and press Enter. | Search modal was not submitting to a search results route. | Added form submit to `/shop?q=<query>`. | Browser retest routed to the shop search URL. | `client/components/shared/search-modal.tsx` |
| QA-004 | Guest wishlist network noise | On PDP while logged out, click wishlist. | Guest-local wishlist toggle still attempted protected API sync. | Read auth token and only call wishlist API when authenticated. | Browser retest toggled local wishlist without 401 noise. | `client/components/product/wishlist-button.tsx` |
| QA-005 | Category API noise | Open menu/category routes backed by merchandising links. | Client/server category lookup used `/categories/by-path`, causing 404s for valid route structures without matching category records. | Resolve category data from the categories collection with normalized path and last-slug fallback. | Browser/menu sweep no longer produced blocking category by-path errors for the tested routes. | `client/hooks/useCategories.ts`, `client/lib/storefront-server.ts` |
| QA-006 | Listing LCP warning | Open listing/collection pages; browser warned the LCP product image should use priority. | Product cards only prioritized `isFeatured`, not above-the-fold grid position. | Added `priority` prop and applied it to first visible grid items. | Build passed and warning-prone listing images are now prioritized. | `client/components/shop/product-card.tsx`, `client/components/shop/product-grid.tsx` |

## Test Data

| Data | Created | Cleaned Up | Notes |
| ---- | ------- | ---------- | ----- |
| Seed catalog/admin data | Yes | No | Created by `npm --workspace server run seed`; used as baseline test data. |
| Cart item from quick add | Yes | Yes | Added and removed the QA-added Signal Cargo item; preserved pre-existing cart state. |
| Cart item from PDP | Yes | Left in local cart during session | Added Minimalist Heavyweight Tee variant `M / Off-White` to verify PDP cart flow. |
| Temporary admin data from E2E | Yes | Yes | Covered by E2E admin-to-storefront reflection cleanup test. |

## Remaining Risks / Needs Deeper Pass

| Area | Status | Notes |
| ---- | ------ | ----- |
| Full admin CRUD matrix | Needs Deeper Pass | Major admin pages loaded and E2E reflection passed, but every create/edit/delete/upload/reorder field across products, categories, collections, CMS, coupons, users, and orders was not exhaustively hand-tested in this run. |
| Checkout/payment/order placement | Needs Work | Cart checkout CTA was verified, but no sandbox payment/order completion was exercised. |
| Footer/social/newsletter | Needs Deeper Pass | Static/footer surfaces were smoke checked, but each external/social/newsletter action was not clicked one by one. |
| Dependency audit | Needs Work | `npm install` completed but reported 1 high severity vulnerability; no forced audit fix was applied. |

## Final Checklist

| Item | Status | Notes |
| ---- | ------ | ----- |
| Homepage tested manually | Pass | Browser rendered and header/home content smoke tested. |
| Header tested manually | Pass | Logo/nav/search/profile/wishlist/cart surfaces checked. |
| Desktop menu tested manually | Pass | All five tabs opened; close/ESC/route-change behavior checked. |
| Mobile menu tested manually | Pass | 360, 390, 430, 768 checked; 1024 desktop behavior verified. |
| Every menu link tested | Pass | 83 unique menu URLs swept. |
| Search tested | Fixed | Result navigation, no-result state, and Enter submit fixed/retested. |
| Category pages tested | Fixed | Representative category and menu routes checked; category API noise fixed. |
| Subcategory pages tested | Fixed | Representative subcategory/menu routes swept through generated URLs. |
| Collections tested | Pass | Collections menu and `/collections/quiet-uniform` flow checked. |
| Product listing tested | Fixed | Filters/grid/sort/quick add/product links checked; image priority improved. |
| Product detail tested | Fixed | Size select, add to cart, wishlist, gallery/visible sections checked. |
| Cart tested | Pass | Add, quantity, remove, totals, checkout visibility checked. |
| Wishlist tested | Fixed | Guest wishlist behavior fixed; protected wishlist redirect checked. |
| Auth/profile tested | Partial Pass | Admin auth tested; storefront protected wishlist redirect tested; full profile/address CRUD not covered. |
| Checkout/order tested if available | Needs Work | Checkout CTA verified; no sandbox order/payment completed. |
| Footer/static links tested | Needs Deeper Pass | Static/footer smoke checked; not every social/newsletter link was clicked individually. |
| Admin login tested | Pass | Invalid and valid seeded-admin login tested. |
| Admin menu manager tested | Partial Pass | Page loaded and E2E admin reflection passed; full CRUD not exhaustively hand-tested. |
| Admin category manager tested | Partial Pass | Page loaded; full field-by-field CRUD not exhaustively hand-tested. |
| Admin collection manager tested | Partial Pass | Covered through storefront manager/collections surfaces and E2E reflection; full CRUD needs deeper pass. |
| Admin product manager tested | Partial Pass | Page loaded; full product CRUD not exhaustively hand-tested. |
| Admin orders/users/coupons/CMS tested if available | Partial Pass | Pages loaded; full module workflows need deeper pass. |
| Admin-to-storefront reflection tested | Pass | E2E temporary data reflection and cleanup passed in desktop project. |
| Security boundaries tested | Pass | Unauthenticated admin APIs, invalid slugs, malformed path checked. |
| Mobile breakpoints tested | Pass | 360, 390, 430, 768, 1024 manually checked; E2E mobile smoke passed. |
| Console/network errors checked | Fixed | Search/wishlist/category/listing warnings fixed where reproducible. |
| Typecheck passed | Pass | `npm run typecheck`. |
| Lint passed | Pass | `npm run lint`. |
| Build passed | Pass | `npm run build`. |
| Unit tests passed | Pass | `npm run test`. |
| E2E tests passed | Pass | `npm run test:e2e`: 20 passed, 4 skipped. |
