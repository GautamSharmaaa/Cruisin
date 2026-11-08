# CMS field consumers

Implemented in the existing CMS, not a separate CMS.

| Admin control | Persisted field | Actual storefront consumer |
|---|---|---|
| CMS page selector | CMSPage slug/id | Independent Home, Men and Women section lists and published snapshots |
| Title/subtitle | Section title/subtitle | EditorialCampaign captions and product-rail heading |
| Desktop/mobile media | content.desktopMedia/mobileMedia | Responsive campaign media |
| Media alternative text | content.altText | Campaign image accessible description |
| CTA label/link | content.ctaText/ctaLink | Validated campaign action |
| Caption alignment | styles.editorial.captionAlign | Campaign `data-caption` preset |
| Campaign height | styles.editorial.heroHeight | Screen/tall CSS height presets |
| Desktop/mobile focal point | styles.editorial.focalPoint/mobileFocalPoint | Breakpoint-specific object positioning |
| Media fit | styles.editorial.mediaFit | Cover/contain preset |
| Overlay | styles.editorial.overlay | None/soft/strong shade preset |
| Desktop product columns | styles.editorial.desktopColumns | Two/four columns; mobile always two |
| Product gutters | styles.editorial.gap | Tight/standard desktop grid gap |
| Quick add visibility | styles.editorial.quickAdd | Actual exact-variant sheet trigger on product rail |
| Category shortcuts | styles.editorial.shortcuts | Campaign navigation with validated internal/HTTPS links |
| Product references/order | products/content.productIds | Canonical hydrated products, existing price/SKU/stock |
| Device visibility/enable/order | Section fields | CmsHomepage renderer ordering and visibility |

Presentation schema is shared by server validation, admin inspector and storefront through `@cruisin/contracts/editorial`. Invalid presets/unsafe shortcut URLs are rejected. Catalog references are hydrated on saved preview reload; unsaved text/presentation edits reach the same renderer through a validated, origin/source-checked parent-to-preview message. Preview messages do not publish or modify inventory.

The existing Storefront administration screen continues to own navigation, collections and catalog configuration. Full scheduling/release/CAS/editorial support-page expansion from the master brief remains separate unfinished scope.
