# Photographic collection and product storefront

Implemented on 2026-11-08 from the user's supplied Farak collection, filter, sort and product screenshots. Cruisin branding, existing local demo catalog images, product data and commerce services remain the source of content. No Farak imagery, product descriptions or shipping/craft claims were imported.

The collection has a compact centered Cruisin wordmark, horizontally browsable category controls, four photograph columns on desktop and two on mobile, small centered captions and exact-variant quick add. Filtering opens an animated left panel with size, availability, price, product type, color, collection and department controls. A debounced request displays the actual matching item count. Invalid price ranges remain in the panel with a validation message. Filter/sort changes preserve the browsing position. Sort choices correspond to the existing backend's supported orders.

The product gallery uses native horizontal scrolling and scroll snap, desktop previous/next controls, mobile image indicators and reduced-motion-aware navigation. Product variants can supply their own photos. A fallback gallery preserves the layout when a product has no images. The purchase card floats over the large desktop photography and follows the gallery in normal flow on mobile. Size and color remain exact SKU choices; quantity is bounded by the selected variant's stock. Add To Cart uses the existing cart action, and Shop now adds the same exact selection then opens the existing checkout. No order or payment is created by the presentation work.

Product details, care and delivery text consume existing catalog fields. Related products use real catalog entries; recently viewed entries come from the existing browser history and exclude the current product. No 24-hour delivery promise, craft time, model measurement or production method is fabricated.

Customer storefront light mode is the new initial theme, using a separate browser preference key (`cruisin-storefront-theme`). The existing dark choice remains available. Shared theme provider defaults stay dark for admin and employee apps. CMS publication and preview controls remain connected to the same storefront components.

## Local fixture cleanup

49 positively identified local operations products (titles beginning `Synthetic physical` / `Synthetic counted`, matching `physical-browser-` / `counted-` slugs and no photographs) were switched from public visibility to hidden through the authenticated local admin API. Their records and operations dependencies were retained. Original IDs, slugs and visibility values are saved in ignored `Cruisin-Backups/local-fixture-visibility-2026-11-08.json` for reversal. This was restricted to the local API on port 8192; no hosted/production edits were made.

## Verification

The full automated suite passed: 661 tests in 105 files. All four app production builds and TypeScript checks passed; the customer app was rebuilt after final gallery/theme refinements. Browser evidence and final screenshots are recorded in `VERIFICATION_EVIDENCE.md`. Browser emulation does not establish physical-device frame-rate guarantees.
