# Cruisin CMS operator handbook

Edition 18 November 2026 · For store administrators and merchandising staff

This guide describes the controls implemented in this repository. Use the admin address assigned to your store and your own admin account. Paths such as `/cms` below are relative to the admin address. Storefront paths such as `/men?view=all` belong to the customer website.

## Contents

1. [Find the right control](#1-find-the-right-control)
2. [Understand saving and publishing](#2-understand-saving-and-publishing)
3. [Edit Home, Men and Women](#3-edit-home-men-and-women)
4. [Choose sections and media](#4-choose-sections-and-media)
5. [Control every supported link](#5-control-every-supported-link)
6. [Manage menus, collections and page settings](#6-manage-menus-collections-and-page-settings)
7. [Configure filters and automatic product loading](#7-configure-filters-and-automatic-product-loading)
8. [Configure loading and motion](#8-configure-loading-and-motion)
9. [Customize the quick-menu ring](#9-customize-the-quick-menu-ring)
10. [Customize the footer](#10-customize-the-footer)
11. [Manage products and size tables](#11-manage-products-and-size-tables)
12. [Recover changes](#12-recover-changes)
13. [Check a release](#13-check-a-release)
14. [Troubleshoot](#14-troubleshoot)
15. [Understand the Overview insights](#15-understand-the-overview-insights)

## 1. Find the right control

| What you want to change | Open | Apply changes with |
| --- | --- | --- |
| Homepage campaigns, sections, pictures and buttons | CMS `/cms` | Save draft, then Publish |
| Men or Women editorial sections | CMS, then choose the page | Save draft, then Publish for that page |
| Logo destination, Men/Women links, department category links | CMS → Storefront settings → Navigation `/cms/navigation` | Save links |
| Footer menu and policy destinations | Navigation, Footer navigation / Footer policies | Save links |
| Header menu entries | Navigation → Header menu links | Save the navigation form |
| Expanded menu columns, cards and promo | Navigation → Mega menu links | Save each edited form |
| Filter groups, automatic loading, loading screen and animation | CMS → Storefront settings → Loading, filters and motion `/cms/experience` | Save experience |
| Quick-menu chrome ring or theme colors | CMS → Storefront settings → Quick menu `/cms/quick-menu` | Save ring appearance |
| Footer wordmark, logo, metallic effect | CMS → Storefront settings → Footer `/cms/footer` | Save footer |
| Collection membership, imagery and defaults | Storefront → Collections | Save collection |
| Page defaults, banners, SEO and filtering | Navigation → Page settings and links | Save page settings |
| Horizontal filter chips | Storefront → Filters | Save the chip form |
| Product pictures, category, stock and size table | Products → open the product | Save product |

The **Storefront settings** menu is in the CMS editor header. **Storefront** in the sidebar opens the wider management area with Navigation, Mega Menu, Collections, Filters, Pages, Delivery and Settings tabs. A manager, admin or superadmin can edit many CMS settings. A disabled field or read-only message may reflect your account permissions. COD payment controls require admin or superadmin access.

## 2. Understand saving and publishing

There are two different workflows.

**Page sections have a draft stage.** Editing changes the canvas. **Save draft** stores the selected section. **Publish** opens a confirmation and applies the page's saved draft sections to the live storefront. Wait for the saved status before publishing. Save each edited section before selecting another. The page selector and other actions may be disabled while there are unsaved changes or an operation is running.

**Storefront settings apply on save.** Navigation, ring appearance, footer appearance, experience settings, collections and page-settings forms have their own save actions. They do not wait for the CMS page Publish button. Some Storefront Settings toggles save as soon as you change them. Watch for the success or error message. A later homepage publish does not roll these settings back.

Changing Home does not publish Men or Women. Work on each page separately. A linked collection, product or page also needs to be available to customers. Adding its link does not create or publish the destination.

## 3. Edit Home, Men and Women

### Replace a homepage campaign

1. Open **CMS** and choose Home in **CMS page**.
2. Select the section in the left list or canvas. The right inspector shows its fields.
3. In **Content**, change the title, description, desktop/mobile media and button labels or destinations exposed by that section.
4. In **Layout**, adjust the presentation. Campaign controls can include caption alignment, screen/tall height, desktop and mobile focal points, cover/contain fit and overlay strength.
5. In **Visibility**, check the active state, device targeting and dates.
6. Use **Desktop** and **Mobile** preview modes. Canvas zoom only changes the editor view.
7. Click **Save draft**. Wait for **Draft saved**.
8. Click **Preview** to inspect the page with editing panels hidden. **Return to editor** restores them. This preview does not publish.
9. Click **Publish**, review the page name and confirm **Publish changes**.
10. Open the live page and test its buttons on desktop and mobile.

### Add, reorder, duplicate or hide a section

- **Add section** opens the section library. Search or browse the types, then add a suitable section and replace the sample content.
- **Suggested sections** is expandable. Click a suggestion or drag its grip onto the page. Suggestions are starting points for editing.
- Drag a section by its grip to reorder it. Up/down arrow buttons provide precise ordering. Wait for the order save to finish.
- The eye control or **Show section** switch changes draft visibility. Publish to apply it publicly.
- **Section options → Duplicate section** creates another section you can edit independently.
- **Section options → Remove section** removes it from the draft after confirmation. Publish to remove it from the live page.
- **Discard changes** abandons unsaved inspector edits.

### Edit department pages

Choose Men or Women from the CMS page selector and repeat the same workflow. `/men` and `/women` can show department editorial content. The default landing links `/men?view=all` and `/women?view=all` open the corresponding product listing directly. Decide which experience you want before changing these links.

### Schedule visibility

Where available, set start/end dates and desktop/mobile hiding separately from the active flag. A section must satisfy its active, publication, scheduling and device rules to appear. Preview both devices and check the intended launch date. Enter dates using the date picker and verify the result in the store's operating timezone.

## 4. Choose sections and media

The library supplies section-specific forms. Only the fields supported by a particular section affect that section. Common choices include the following.

| Need | Suitable section family | What to check |
| --- | --- | --- |
| Main image campaign | Campaign hero / Hero Banner | Desktop/mobile media, caption, CTA, focal points |
| Video campaign | Video Landing / mobile media landing | Video URL, poster, autoplay, mute, loop, device visibility |
| Several editorial images | Image Carousel | Slide labels, image URLs, links, speed, arrows and dots |
| Moving campaign cards | Orbit Cards | Individual cards, images, destinations and motion |
| New products or a curated product rail | Product Carousel | Product source, manual choices, limit and card presentation |
| Featured merchandise | Featured Collection, Best Sellers, Trending Now | Real product/collection references and availability |
| Limited launch | Hot Drop / Limited Drop Timer | Launch/end dates, product references, CTA and sold-out state |
| Category browsing | Category Editorial Grid | Each tile's label, image and destination |
| Brand storytelling | Brand Story / Lookbook / Editorial Story | Copy, images, linked products and CTA |
| Promotions and signup | Discount Banner, Popup Campaign, Newsletter | Copy, offer destination and supported form settings |
| Supporting content | Social Proof, Marquee, Shop the Look, Recently Viewed | Correct content and referenced products |

Use the names shown in your section library. A sample coupon, countdown or marketing claim is editorial content. Set up the actual discount or product availability in its corresponding admin area as well.

### Media workflow

Use the upload/replace control where present or select existing media from the library. Some forms accept a public media URL instead. Wait for upload completion, verify the preview, then save the section. An upload success message does not publish the section.

Prepare a wide desktop crop and a portrait mobile crop when the form supports both. Use adequate source resolution and keep important details away from crop edges. **Cover** fills the space and crops edges. **Contain** preserves the entire image and can leave space around it. Focal-point controls move the crop toward the subject.

For video, provide a lightweight playable file and a poster image. Muted video is the reliable choice for autoplay. A browser may still prevent playback. The poster must look intentional on its own.

Some older content fields use one record per line, separated with `|`. Follow the sample format shown in that field. For example, a tile/slide field may use `Label|https://image-address|/shop`. Do not paste that format into a normal single-link field. Campaign shortcut links use `Label|/destination`, one per line. Click outside that field to complete validation before saving.

Product, category and collection pickers connect real catalogue records. A CMS section image does not replace the product's actual gallery images.

## 5. Control every supported link

### Landing header and footer links

1. Open **CMS → Storefront settings → Navigation**.
2. Set **Logo link** to the desired storefront path, normally `/`.
3. Edit the two **Landing header** rows for Men and Women. These two rows are fixed in count.
4. Edit **Men's category links** and **Women's category links** for the strip beneath the header.
5. Edit **Footer navigation** and **Footer policies**.
6. Use **Add link** or the remove button where available. Each editable group supports up to twelve entries.
7. Click **Save links** and wait for confirmation.

This editor accepts internal paths beginning with `/`. Use the separate external-link fields where supported for external destinations. **Reset defaults** fills the form with defaults. Click **Save links** to apply them.

### Useful storefront destinations

| Destination | Meaning |
| --- | --- |
| `/` | Landing page |
| `/men?view=all` | All men's products |
| `/women?view=all` | All women's products |
| `/men` or `/women` | Department page including its editorial entry experience |
| `/shop` | General product listing |
| `/sale` | Sale listing |
| `/new-featured` | New/featured listing |
| `/collections` | Collections entry page |
| `/collections/collection-slug` | Existing collection |
| `/product/product-slug` | Existing product detail |
| `/pages/page-slug` | Existing published custom CMS page |

Copy actual product and collection slugs from their records. Do not assume a display title is the URL. Creating a navigation label does not create a custom page. Use an existing published destination, or have an administrator/developer provision the page if it is absent from your editor.

For an exact section link, select the section and expand **Section options**. Copy the read-only **Section link**. Its anchor depends on that section's identity. Replacing the section with a newly created one can change the anchor.

### Which link editor owns which item

- Landing Men/Women, department strip, footer menus and policies use **CMS Navigation**.
- The hamburger/header menu uses **Storefront → Navigation**.
- Expanded menu entries use **Storefront → Mega Menu**.
- Campaign buttons, card links and shortcuts belong to their individual CMS sections.
- Page hero/banner CTA fields belong to **Storefront → Pages**.
- Collection card and banner settings belong to **Storefront → Collections**.

Keep these destinations consistent. Editing one surface does not rewrite every other link.

## 6. Manage menus, collections and page settings

### Header navigation

Open **Header menu links** from CMS Navigation. Create or edit an entry's label, slug, destination, type, sort order and visibility. Types include simple, mega-menu, collection, category and custom URL entries. Mega menus also have an enabled flag and layout. Save the form and open the storefront menu to verify its order and destination. Lower sort-order values appear earlier.

### Mega menu

Choose the parent navigation entry. Add/edit its columns, then the links within each column. Set each link's label, destination, linked type/reference, order, visibility, optional highlight and arrow. Collection cards can override their title and desktop/mobile imagery. Promo controls include copy, desktop/mobile media, button label/destination, overlay and device visibility. Save each form separately.

### Collections

Open the Collections tab and edit a collection. Set its title, slug and description, product/category membership, sort order and visibility/publication flags. Product/category ID fields use actual IDs, separated with commas. Reference choices help identify valid records. Leave advanced JSON order fields unchanged unless you understand the expected format.

Hero, card, thumbnail, banner, mobile and video fields affect different placements. Menu-card overrides affect the menu card. Set **Show in menu** when the collection should be discoverable there. Save and visit the collection itself as well as any menu card linking to it.

Collections also have default sort, default grid, filter visibility, advanced-filter and SEO fields. Default grid choices are 4, 2 and 1, subject to the responsive storefront layout.

### Page settings and links

Open **Page settings and links**. Choose/edit the matching page type and slug. Available settings include title/subtitle, desktop/mobile hero and banner media, video/poster, CTA text/link, banner visibility, publication, default sort/grid, filter controls and SEO/OG image.

These are browsing defaults and page metadata. CMS section content is edited in `/cms`. Set the page's options deliberately and verify the actual customer route after saving.

### Global Storefront Settings and Delivery

Global settings include default grid, advanced filters, collection carousel, listing hero backgrounds and storefront navigation visibility. Several of these save immediately when changed. Experience/ring forms underneath have their own Save buttons.

The Delivery tab controls standard/express charges, comparison price and a free-standard-delivery threshold. A threshold of zero disables that threshold promotion. COD has its own enabled flag and fee with separate permission requirements. These affect checkout pricing, so verify using a test cart after saving.

## 7. Configure filters and automatic product loading

Open **CMS → Loading, filters and motion → Collections**.

- Enable **Load the next products automatically** to fetch another batch as the customer approaches the end of the loaded products. The storefront shows a loader while requesting more. Loading ends when there are no further products.
- Use **Show sort menu** and **Show grid density control** for those controls.
- Choose the available groups — Size, Availability, Price, Product type, Color, Collection, Department and Sale.
- Click **Save experience**.

The filter drawer and its expandable groups start collapsed. Customers open the drawer and expand the groups they need. Color choices display matching swatches based on the product color data. Add colors, sizes and categories to the products themselves to populate meaningful choices. Men's/women's fixed department pages do not need an extra department selector.

For page-specific behavior, use **Page settings and links**. The page/collection must allow filters and advanced filters, and the global controls must also permit them. If a filter is missing, check all three levels. The Storefront **Filters** tab manages named horizontal filter chips and their order/visibility. It does not create product sizes or stock.

Automatic loading depends on the current filters. Changing a filter can reduce the result count, and a short list can already be complete. Test with a collection containing more than one batch.

## 8. Configure loading and motion

### Loading screen

In **Loading, filters and motion → Loading screen**, choose the Cruisin loading symbol or Off. Choose the script wordmark or diamond mark, the loading message, the background theme and an optional accent color. **Use theme color** restores the theme-derived accent. Save experience, then open the storefront in a fresh tab or reload to test the entry sequence. Some load states are too short to show a long animation.

### Motion & gallery

This tab controls wishlist hearts, page/product entrance animation, gallery arrows, image progress, image gradient, desktop scrolling, heart animation, menu opening and animation pace.

Choose **Smooth** for desktop smooth scrolling or **Native** for browser scrolling. Touch scrolling uses the storefront's mobile behavior. The device's reduced-motion preference can reduce animation. Use Calm or Quick to tune the supported transitions. Turning off **Show image progress** hides gallery progress indicators where the gallery supports this option.

Click **Save experience**. Refresh or return to the storefront tab and test a full scroll, a menu, a product gallery and a back-to-top link. The admin dashboard's insights animation is separate from these storefront controls.

## 9. Customize the quick-menu ring

Open **CMS → Quick menu**. Select **Chrome** for a polished metallic ring or **Colored glow** for color selection. Colored glow exposes separate light-theme and dark-theme colors. Use the picker or enter a six-digit hex value such as `#b58b35`. Color fields are disabled while Chrome is selected.

Click **Save ring appearance**, then test the customer quick-menu button in both themes. **Reset defaults** only fills the form until saved. This screen customizes ring finish and colors. It does not currently edit the quick menu's action list, Instagram destination, stories content or glass material.

## 10. Customize the footer

Open **CMS → Footer**. The preview's Light/Dark buttons let you inspect each theme without changing the customer's chosen theme.

1. Choose Chrome, Gold or Brushed as a starting preset.
2. Choose Text or Logo content. Text accepts a short wordmark. Logo supports a public logo URL or the **Upload PNG** control. Use a transparent, high-resolution PNG for upload.
3. Set **Light color** and **Dark color** separately.
4. Tune the metallic controls using the table below.
5. Choose Intro animation and Metallic finish.
6. Check both previews and click **Save footer**.

| Control | Effect |
| --- | --- |
| Density | Changes the density of the metallic pattern |
| Softness | Softens the highlights and pattern transitions |
| Dispersion | Adds color separation to highlights |
| Distortion | Warps the surface pattern |
| Edge bend | Changes the appearance near the mark's edges |
| Angle | Changes the direction of the metallic pattern |
| Speed | Changes surface-animation speed |
| Scale | Enlarges or reduces the mark |
| Rotation | Rotates the mark |
| Mouse tilt | Changes the mark's pointer response |

Use subtle dispersion/distortion for a clean chrome finish. Excessive scale or rotation can crop a mark. **Reset to default** needs Save footer to apply. Changing footer appearance applies across the storefront.

Footer menu labels and policies are edited separately in **CMS Navigation**. The footer's support email, contact sentence, social URLs and copyright wording currently come from the storefront's `client/constants/footer-copy.ts`. They are not fields in this CMS screen. Ask the developer to change those constants if needed. The copyright year updates automatically. The former orange footer wave has no control here.

## 11. Manage products and size tables

Product content belongs in **Products**. Open the appropriate product, edit its copy, media, primary category, variants, prices and availability, then save. CMS product sections reference these records. A new CMS campaign does not change stock or price.

### Edit an individual size chart

1. Open the product and find its size-guide editor.
2. Edit each column heading, for example Size, Chest (cm), Length (cm).
3. Use **Add row** for another size and **Add column** for another measurement.
4. Fill each cell. Put measurement units in the headings and explain the measurement convention in the product copy if needed.
5. Use the row/column trash controls to remove unwanted entries. At least one column remains.
6. Save the product, open its storefront page and click **Size Guide** to check the table.

For reuse, choose the primary category first. Select a product under **Copy from a product in this category**, then click **Copy size guide**. Review the copied values and save the target product. The copied chart is independent — later edits to the source product do not update the target automatically. The picker lists eligible products with guides in that category, up to its loaded result limit.

Older guides can contain a URL or fit notes. **Use a table** converts the editor to tabular content and replaces that legacy guide when you save. Copy any needed notes first. **Clear guide** clears this product's guide once the product is saved.

## 12. Recover changes

For unsaved section edits, use **Discard changes**. For saved page drafts, open **Version history**, identify the version by date/label and restore it. Restoration replaces the current draft sections with that snapshot. Inspect the result, save any further edits, and **Publish** to make the restored version live. History currently lists the most recent twenty versions.

Page versions do not restore global experience settings, navigation, footer appearance, ring settings, product records or collections. Before changing these, record their current values or take a screenshot. Their Reset buttons restore built-in defaults, which may differ from your store's previous values.

## 13. Check a release

Use this sequence for a campaign handover.

1. Confirm the page name, campaign dates and publication state.
2. Review desktop and mobile previews for cropping, contrast, spelling and button labels.
3. Save each changed section and publish the intended page.
4. Open the customer website and click the logo, Men/Women, department strip, header menu, campaign CTAs, collection links, footer menus and policies.
5. Open the filter drawer, expand a group, apply/clear filters and change sorting.
6. Scroll through the product list until another batch loads, then check the end state.
7. Open a product, swipe its images, view its size table and test size selection.
8. Check loading, quick menu and footer in both themes.
9. Record what changed and where it was saved/published so the next operator can maintain it.

## 14. Troubleshoot

| Symptom | Check and action |
| --- | --- |
| Canvas changed but live page did not | Save draft, then Publish the correct page and confirm success |
| Publish disabled | Resolve unsaved/failed edits or wait for saving/reordering to finish |
| Section absent | Active state, device hiding, dates, correct page, publication and referenced content |
| Menu label opens the wrong destination | Edit the editor that owns that surface, then test the actual path |
| Men/Women opens editorial content first | Use `/men?view=all` or `/women?view=all` for direct product listing |
| A new link gives a missing-page response | Check the exact slug and confirm the destination exists and is public |
| Image looks blurry or heavily cropped | Use a higher-resolution original, mobile crop and suitable focal point/fit |
| Video does not autoplay | Confirm supported public URL, muted playback and a valid poster image |
| Filter group missing | Experience group visibility, page/collection filter flags and global advanced filters |
| Color choice looks wrong | Product color name/value and variant data, then recheck the storefront swatch |
| Automatic loading stops | No more matching products, a request error, or automatic loading is disabled |
| Smooth scrolling differs on mobile | Mobile touch behavior and reduced-motion settings can differ from desktop |
| Saved appearance not visible | Confirm success and return to/reload the storefront tab, then check the right theme |
| Controls are disabled | Account permission, unchanged form, an active save/upload or invalid values |
| Footer contact details cannot be found | Those details are currently maintained in the footer copy file by a developer |
| Products missing from a CMS product section | Product reference/source, visibility, availability and collection membership |

If a save fails, keep the editor open, read the error, fix the invalid field and retry. Confirm success before leaving. A preview result alone does not prove a successful save or publish.

## 15. Understand the Overview insights

The Overview insights card follows the admin light/dark theme. It rotates its live highlights every eight seconds without arrows, progress ticks or a widget refresh button. Sales and storefront-activity data refresh every thirty seconds while the dashboard is active. A hidden/background tab can pause polling and rotation. Returning to the page resumes normal updates.

Highlights use the selected reporting period and include paid sales, outstanding COD, inventory and storefront visits. **Updated** shows the most recent successful sales-data update in India Standard Time. If refreshing fails, the last available data can remain visible with a failure message. Check the linked analytics/orders/products page for details.

**Generate summary** remains available to permitted roles for an on-demand generated explanation. Automatic data polling does not issue a new paid AI-generation request every thirty seconds. The animated ring is decorative. The underlying values still come from actual store data.


## Mobile menu and purchase controls

The storefront menu opens as a full-height screen. Selecting a mega-menu item opens its links; Back returns one level and Close dismisses the menu. CMS labels, visibility and sort order are used directly.

- **CMS → Storefront navigation** controls the department links below the header and the utility links at the bottom of the menu. The **Show Men / Women beneath the header** setting defaults to **Landing page only**; choose **All pages** or **Hidden** when needed. Utility links can be added, removed or reordered by editing the list.
- **Storefront → Header menu links** controls the menu’s top-level labels, order, destinations and mega-menu toggle.
- **Storefront → Mega menu links** controls columns, links, collection image cards and promotional imagery. One visible column displays its links directly; multiple visible columns open as separate submenu screens. Image cards appear in a horizontal swipe strip below the links. Set the promotion’s mobile/desktop visibility as needed.
- **CMS → Experience → Motion & gallery → Pin mobile purchase controls until the end of product details** enables the mobile color, size and Add to Cart panel. It stays at the viewport bottom while browsing images and settles after the product details before related products. Turning it off restores the inline purchase controls. Stock and variant selection still govern Add to Cart availability.

Menu opening follows the existing Slide/Fade and animation pace settings. Reduced-motion preferences suppress navigation movement.

The **Hide header on scroll down; reveal on scroll up** toggle in **Motion & gallery** controls the sliding header. The header stays visible near the top of a page and while the menu or search is open.

On mobile, **Select size** opens a sheet above the purchase bar. Out-of-stock sizes remain visible and disabled. Selecting an available size closes the sheet and updates Add to Cart. The color control opens a full-screen selector with product thumbnails; changing color resets the selected size and updates the product gallery.
