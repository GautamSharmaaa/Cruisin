# Department campaign assets

Local editorial demonstration assets, 9 November 2026. These films are editorial imagery; they are not representations of the inventory or endorsements by the models.

- Home: supplied existing `client/public/hero.mp4`, shortened to an eight-second, silent 720p loop.
- Men: Ron Lach, “A Man Wearing a Black and White Outfit”, https://www.pexels.com/video/a-man-wearing-a-black-and-white-outfit-8346469/ . Eight-second silent 960px portrait loop, plus extracted poster/detail stills.
- Women: Leeloo The First, “Woman Walking and Modelling in the Street”, https://www.pexels.com/video/woman-walking-and-modelling-in-the-street-5901089/ . Nine-second silent 720p loop, plus extracted poster/detail stills.

Pexels license checked: https://www.pexels.com/license/ . Source pages mark the clips free to use. No endorsement implied. Original downloads stay outside the repository; only optimized media is included. Posters remain visible for reduced motion, save-data and failed autoplay.

CMS: Home, Men and Women have separate published hero sections and separate image/video paths. Men and Women also have different editorial copy, section order and product rail layouts. The initial Home view is a centered Men/Women gateway. Department category links appear immediately beneath the header after choosing a department. `scripts/v2-department-campaigns.mjs` applies this local-only CMS setup repeatably, keeps existing version history and writes a before-state snapshot to `/tmp/cruisin-department-cms-before.json`. Use the existing admin CMS editor to replace individual media and copy.

## Studio catalog extension — 9 November 2026

The latest Home entry uses `home-studio.mp4` and its extracted poster: a silent, optimized split composition of the credited Men/Women films above. The older neon streetwear loop remains available in the media library. Home now continues below the gateway with a product catalog, four linked posters, a studio film campaign and an editorial story. Each is a normal editable, sortable CMS section. Men/Women have separate curated product rails.

Eight **local demo** products use four isolated sample photographs each from [DummyJSON products](https://dummyjson.com/docs/products), [source project](https://github.com/Ovi/DummyJSON): IDs 83, 85, 86, 87 (shirts) and 177–180 (dresses). Optimized source WebP files are stored under `client/public/images/catalog-demo/`; product slugs are `studio-demo-{id}`. Original source titles are preserved, brand is Studio Demo, descriptions identify the sample data, and prices/sizes are synthetic. Inventory is zero: no stock was created outside the physical inventory workflow. These images are prototyping assets, not photographs of Cruisin inventory; replace them with approved merchandise photography before selling these items.

`scripts/v2-editorial-catalog.mjs` performs repeatable setup through the existing authenticated API, refuses nonlocal API/storefront hosts, and writes timestamped before-state snapshots to `/tmp/cruisin-editorial-catalog-before-*.json`. The local storefront origin for product URLs is configurable through `V2_STOREFRONT_URL`; media and product galleries can also be replaced in Admin → Products. Existing CMS version history is retained; the earlier local best-seller/department rails are hidden rather than deleted.
