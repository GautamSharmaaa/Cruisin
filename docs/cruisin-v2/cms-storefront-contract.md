# CMS storefront contract

Existing contracts retained for this slice. See [API contracts](cms-storefront/API_CONTRACTS.md), [field consumers](cms-storefront/CMS_FIELD_CONSUMER_MAP.md), and [unfinished shared contracts](cms-storefront/CMS_CONTRACTS.md).

## Reference editor (2026-11-08)

The admin CMS now uses a section list, scaled real-storefront iframe and tabbed inspector. Home, Men and Women remain independent pages. The canvas uses a 1280px desktop or 390px mobile viewport; Fit, 50%, 75% and 100% affect preview scale only. Under 1200px, three accessible pane buttons replace the simultaneous columns.

`styles.editorial.buttons` is an optional ordered array of at most three `{label, href}` objects. Omission uses the legacy CTA; an explicit empty array hides the CTA. Destinations use the existing safe-link schema. `overlayStrength` is an integer from 0 to 80 in steps of 10 (default 30). These fields are shared between validation, admin editing and public rendering. Incomplete links stay editable but cannot be sent as a valid preview or published section.

Embedded preview messages require the exact configured admin origin and parent window. The preview announces readiness after installing its message handler; the admin then sends the selected draft. Selection messages require the configured storefront origin, matching iframe window and an existing section ID. Selection overlays are preview-only. Public pages receive no editor controls.

Media thumbnails resolve storefront-relative URLs against the configured storefront origin. The admin CSP permits images and frames from that exact origin. Replacement uploads use the existing authenticated public-media endpoint. Media deletion rejects assets referenced by known CMS media fields in drafts, retained versions or library entries, preserving rollback. Restoring a version updates the draft; publication remains a separate action.
