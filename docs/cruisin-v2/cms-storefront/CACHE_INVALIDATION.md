# Cache Invalidation

Updated 2026-11-07. Status: **IMPLEMENTED for described controls; master scope remains IN PROGRESS**.

Public pages render dynamically; saved previews are private/no-store and noindex/no-referrer. Unsaved preview patches are browser-memory-only and do not alter the public revision. The browser acceptance test verifies public content before and after an actual CMS publication. Coordinated CDN invalidation/propagation acknowledgments remain unfinished.
