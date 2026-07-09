# Storefront Manager Deep Browser QA And Fix Report

Date: 2026-07-08

## 2026-07-09 Focused Recheck

Admin Dashboard -> Storefront Manager (`/storefront`) was rechecked against the running local stack after the remaining admin/browser QA work.

### Fix Applied

- Updated `client/e2e/storefront-manager-visibility.spec.ts` to target the current name-specific accessible labels for Mega Menu column/link/card controls, such as `Hide Visibility QA Column`, `Edit Button CRUD Link`, and `Delete Button CRUD Card Updated`.
- This keeps the UI's more useful accessible names intact while removing stale generic test selectors like `Hide column`, `Edit link`, and `Delete card`.

### Browser Smoke Check

In-app browser was used against `http://localhost:3001/storefront`.

- Storefront heading loaded successfully.
- Tabs present: Navigation, Mega Menu, Collections, Filters, Pages, Settings.
- Panels opened successfully:
  - Header Navigation Manager
  - Mega Menu Builder
  - Collection Manager
  - Filter Chip Manager
  - Page Settings
  - Site Settings
- No horizontal overflow observed at the live browser viewport.
- Browser console errors: `0`.

### Verification Commands

- `npm run typecheck` -> passed
- `npm --workspace client run test:e2e -- e2e/storefront-manager-visibility.spec.ts` -> `16 passed, 2 skipped`

### Cleanup

Mongo cleanup was verified for Storefront QA records:

```json
{"nav":0,"collections":0,"tags":0,"pages":0}
```

## 2026-07-09 Manual Link Re-Add And Actions Recheck

The in-app browser was used on Admin -> Storefront with a temporary QA navigation item.

### Link Remove/Re-Add Result

- Created a temporary Mega Menu navigation item, column, and link.
- Deleted the existing link from the Mega Menu UI.
- Added a new link back with the same label and href as the deleted link.
- Verified the recreated link appeared in the UI with actions:
  - `Hide Manual Link Readd Link`
  - `Edit Manual Link Readd Link`
  - `Delete Manual Link Readd Link`
- Browser console errors: `0`.
- Horizontal overflow: none.

### Component Action Sweep

Live action controls were checked across:

- Navigation -> row hide/edit/delete actions present.
- Mega Menu -> column and link hide/edit/delete actions present.
- Collections -> row hide/edit/delete actions present.
- Filters -> chip hide/edit/delete actions present.
- Pages -> page hide/edit actions present.
- Settings -> global setting controls present; no row action buttons expected.

### Automated Coverage Added

`client/e2e/storefront-manager-visibility.spec.ts` now explicitly verifies:

- Existing Mega Menu link delete.
- Backend no longer contains that link.
- New Mega Menu link can be created again with the same previous label and href.
- The recreated link can still be deleted during cleanup.

### Verification Commands

- `npm --workspace client run test:e2e -- e2e/storefront-manager-visibility.spec.ts` -> `16 passed, 2 skipped`
- `npm run typecheck` -> passed
- `npm run lint` -> passed

### Cleanup

Mongo cleanup was verified for Storefront QA records:

```json
{"nav":0,"collections":0,"tags":0,"pages":0,"columns":0,"links":0}
```

## 2026-07-09 Screenshot Components CRUD And Visibility Check

The screenshot-covered Storefront Manager components were checked live in the in-app browser:

- Header Navigation Manager row table actions.
- Header Navigation Manager create/edit form.
- Mega Menu Builder column cards.
- Mega Menu Builder nested link cards.

### Operations Performed

Using a temporary `screenshot-crud-*` navigation record:

- Navigation:
  - Created a new header navigation item.
  - Edited label and href.
  - Hid the row and confirmed the button changed to `Show`.
  - Showed the row and confirmed the button changed back to `Hide`.
  - Deleted the row from the action button.
- Mega Menu column:
  - Selected the temporary navigation item.
  - Created a column.
  - Hid and showed the column.
  - Edited the column title.
  - Deleted the column.
- Mega Menu link:
  - Created a link inside the temporary column.
  - Hid and showed the link.
  - Edited the link label.
  - Deleted the link.
  - Added the link again with the same href.
  - Deleted the re-added link.

### Result

- Browser console errors: `0`.
- Horizontal overflow: none.
- No code changes were required for this screenshot-specific pass.
- Temporary Mongo records were fully cleaned:

```json
{"nav":0,"columns":0,"links":0}
```

## 2026-07-09 Header Navigation Manual Browser Check

The Header Navigation Manager component from the latest screenshot was tested live in the in-app browser with a temporary `header-nav-manual-*` row.

### Operations Performed

- Created a new navigation row from the form.
- Verified the row appeared in the table with `Visible` status.
- Opened edit mode and used `Cancel`, verifying the form returned to `Add Navigation`.
- Edited the row label and href, then saved.
- Hid the row with the action button.
- Verified the same table row changed to `Hidden` and the action changed to `Show`.
- Showed the row again.
- Verified the same table row changed back to `Visible` and the action changed to `Hide`.
- Deleted the temporary row from the table action.
- Verified the row disappeared from the UI.

### Verification

- Public `/navigation` no longer contained the temporary slug after delete.
- Focused regression command passed:
  - `npm --workspace client run test:e2e -- e2e/storefront-manager-visibility.spec.ts -g "button and CRUD"` -> `1 passed, 1 skipped`
- Browser console errors: `0`.
- Horizontal overflow: none.
- Mongo cleanup:

```json
{"nav":0,"columns":0,"links":0}
```

## 2026-07-09 Header Navigation Visibility UI Fix

Issue reported from the Header Navigation table: tapping the hide/show eye action could leave the row status as `Visible` and the action button as `Hide`, with no visible UI update.

### Fix Applied

- Updated the Storefront Manager visibility guard so a stale pending update for another row no longer blocks the current row's eye action.
- Added direct touch handling to the reusable visibility action button, with `touch-manipulation`, so touch taps trigger the same visibility action path as mouse clicks.

### Verification

- Confirmed `Sale` was restored to visible after repro probes.
- Focused visibility regression passed:
  - `npm --workspace client run test:e2e -- e2e/storefront-manager-visibility.spec.ts -g "toggles visibility"` -> `1 passed, 1 skipped`
- `npm run typecheck` -> passed
- `npm run lint` -> passed
- Mongo cleanup for Storefront QA prefixes:

```json
{"headerManual":0,"screenshotCrud":0,"visibilityQa":0,"buttonCrud":0}
```

## Scope

Admin Dashboard -> Storefront Manager (`/storefront`) was reviewed and fixed across:

- Navigation
- Mega Menu
- Collections
- Filters
- Pages
- Settings

## Fixes Implemented

- Added row-level visibility buttons with `Eye` / `EyeOff` actions for:
  - Navigation rows
  - Collection rows
  - Filter chip rows
  - Page settings rows, mapped to `isPublished`
  - Mega Menu columns
  - Mega Menu links
  - Mega Menu collection cards
  - Mega Menu promo panel
- Each visibility action now:
  - Uses one-click toggle behavior.
  - Shows a disabled/pulsing loading state while the update/refetch is in flight.
  - Reuses existing toast handling.
  - Calls the existing authenticated partial `PUT` backend endpoints.
  - Refetches admin Storefront Manager data.
  - Does not delete records.
- Added product/category datalist suggestions to the Collections form so Product IDs and Category IDs can be chosen with readable labels while keeping the existing comma-separated ID contract.
- Tightened older storefront browser QA selectors so tests target the intended menu/dialog scopes instead of matching duplicate homepage/menu/popup content.
- Fixed repeated admin form label/input IDs by generating unique fallback IDs in the shared `Input` component. This prevents repeated labels such as `Title` from pointing at the wrong field in dense CRUD forms.
- Fixed global Site Settings UI refresh after save by updating the React Query cache from the `PUT /admin/site-settings` response before invalidation/refetch.
- Fixed Site Settings seeding so defaults are applied only on insert. The previous `$set` path reset admin-managed global settings back to defaults whenever storefront settings were loaded.
- Made the broader storefront browser QA listing/PDP test self-contained by enabling the global flashlight/advanced-filter controls it relies on, then restoring the previous settings after the test.

## Backend Verification

No new backend endpoints were required. Existing protected partial update routes already support the needed visibility fields:

- `PUT /admin/navigation/:id`
- `PUT /admin/mega-menu/columns/:id`
- `PUT /admin/mega-menu/links/:id`
- `PUT /admin/mega-menu/collection-cards/:id`
- `PUT /admin/mega-menu/promos/:id`
- `PUT /admin/collections/:id`
- `PUT /admin/tags/:id`
- `PUT /admin/page-settings/:id`

Public storefront filtering was verified through E2E checks against:

- `/navigation`
- `/collections`
- `/tags`
- `/page-settings/:pageType/:pageSlug`
- `/site-settings`

## Browser QA

In-app browser was used against `http://localhost:3001/storefront` after clean boot/login.

Observed visibility controls:

- Navigation: 5 row buttons
- Mega Menu: 29 controls across columns, links, cards, and promo
- Collections: 43 row buttons in the current seeded/local dataset
- Filters: 14 row buttons
- Pages: 5 row buttons
- Settings: no row visibility buttons; this tab uses existing global setting toggles

No horizontal overflow was observed in the admin Storefront Manager tab audit.

## Automated Coverage Added

Added `client/e2e/storefront-manager-visibility.spec.ts`.

Coverage includes:

- Creates isolated QA records through authenticated admin APIs.
- Logs into Admin UI.
- Toggles visibility from the admin UI for Navigation, Mega Menu column/link/card/promo, Collections, Filters, and Pages.
- Verifies public storefront API reflection after hidden/shown states.
- Exercises admin UI CRUD buttons directly:
  - Navigation add, edit, cancel, hide, show, delete.
  - Mega Menu column/link/card/promo add, edit, cancel, load current, hide, show, delete.
  - Collections add, edit, cancel, hide, show, delete/hide.
  - Filters add, edit, cancel, hide, show, delete/hide.
  - Pages add, edit, cancel, hide, show.
  - Settings default grid and flashlight toggles, verified against public storefront settings and restored.
- Cleans up temporary records.
- Runs responsive no-overflow checks for `1440`, `1280`, `1024`, `768`, `430`, `390`, and `360` widths on both Playwright projects.

## Verification Commands

Clean start:

- `npm install` -> passed, no vulnerabilities
- `npm run dev:db` -> Mongo container running
- `npm --workspace server run seed` -> passed
- API health, storefront `/`, admin `/login` -> all returned `200`

Final checks:

- `npm run typecheck` -> passed
- `npm run lint` -> passed
- `npm run test` -> passed
- `npm run build` -> passed
- `npm --workspace client run test:e2e -- storefront-manager-visibility.spec.ts -g "button and CRUD"` -> `1 passed, 1 skipped`
- `npm --workspace client run test:e2e -- storefront-manager-visibility.spec.ts` -> `16 passed, 2 skipped`
- `npm --workspace client run test:e2e -- cruisin-browser-qa.spec.ts -g "category, collection, listing controls"` -> `2 passed`
- `npm run test:e2e` -> `51 passed, 7 skipped`

Note: one intermediate build/E2E attempt failed because I accidentally ran Next build and Playwright dev servers in parallel, which corrupted generated `.next` manifests. I stopped the run, removed only generated `client/.next` and `admin/.next`, and reran sequentially. The clean sequential build and full E2E suite passed.

## Result

Storefront Manager visibility controls and CRUD buttons are now tested across all requested relevant sections. Admin changes persist through the backend, admin data refreshes, storefront/public API state reflects hidden/shown and global settings changes, and temporary test data is cleaned up after verification.
