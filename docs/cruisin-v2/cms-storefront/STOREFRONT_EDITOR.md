# Storefront editor

Implemented from the user's supplied CRUISIN Storefront Editor reference on 2026-11-08. The supplied image is a visual reference; existing authentication, roles, themes and commerce services remain authoritative.

- Header: page breadcrumb, save state, Save draft, preview-only mode and publish confirmation.
- Sections: Home/Men/Women selector, template library, drag handles, accessible up/down alternatives, visibility, version history.
- Canvas: actual shared storefront renderer with section selection outline, desktop/mobile viewport, fit/percentage scaling. Local unsaved patches stay in the preview until saved; published snapshots stay isolated.
- Inspector: Content/Layout/Visibility tabs, heading and supporting copy, desktop/mobile image replacement, up to three named CTA destinations, caption position, crop/focal presets, overlay strength, device/schedule visibility, show switch, duplicate and remove.
- Narrow screens: switch between Sections, Preview and Section inspector without squeezing three columns. Existing light/dark/system themes remain available.
- Modal keyboard behavior: initial focus, Tab containment, Escape close and focus restoration. Tab controls support Left/Right keys.

The implementation uses the existing section templates and APIs. This editor does not claim completion of the separate enterprise-wide atomic release, conflict resolution or scheduler backlog described in the broader master brief. See the implementation report for remaining scope.
