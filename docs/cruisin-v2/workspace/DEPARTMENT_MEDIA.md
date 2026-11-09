# Department campaign assets

Local editorial demonstration assets, 9 November 2026. These films are editorial imagery; they are not representations of the inventory or endorsements by the models.

- Home: supplied existing `client/public/hero.mp4`, shortened to an eight-second, silent 720p loop.
- Men: Ron Lach, “A Man Wearing a Black and White Outfit”, https://www.pexels.com/video/a-man-wearing-a-black-and-white-outfit-8346469/ . Eight-second silent 960px portrait loop, plus extracted poster/detail stills.
- Women: Leeloo The First, “Woman Walking and Modelling in the Street”, https://www.pexels.com/video/woman-walking-and-modelling-in-the-street-5901089/ . Nine-second silent 720p loop, plus extracted poster/detail stills.

Pexels license checked: https://www.pexels.com/license/ . Source pages mark the clips free to use. No endorsement implied. Original downloads stay outside the repository; only optimized media is included. Posters remain visible for reduced motion, save-data and failed autoplay.

CMS: Home, Men and Women have separate published hero sections and separate image/video paths. Men and Women also have different editorial copy, section order and product rail layouts. The initial Home view is a centered Men/Women gateway. Department category links appear immediately beneath the header after choosing a department. `scripts/v2-department-campaigns.mjs` applies this local-only CMS setup repeatably, keeps existing version history and writes a before-state snapshot to `/tmp/cruisin-department-cms-before.json`. Use the existing admin CMS editor to replace individual media and copy.
