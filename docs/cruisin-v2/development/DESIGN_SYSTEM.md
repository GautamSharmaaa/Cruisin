# Design System

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: IMPLEMENTED; browser themes and keyboard dialog checks VERIFIED LOCALLY.

`packages/ui` supplies semantic CSS tokens, Radix primitives and shared shadcn-style APIs: button, card, field/input, alert, skeleton, dialog, sheet/drawer, confirmation, tabs, dropdown/select/combobox, calendar/date picker, data table, pagination, tooltip, command, OTP input, toast and upload controls. `packages/operations-ui` contains business forms; it does not own a separate data store.

next-themes provides class-based light/dark/system preference, persisted locally with hydration-safe selection and root hydration suppression. Styles apply to all three apps. Storefront branding/components remain intact; operational screens prioritize compact usable controls. Tailwind scans shared packages via relative config. New operations forms have loading, errors, empty states and dialog keyboard support; mobile/desktop Playwright runs real forms.

New camera scanner is explicit permission-based with manual fallback and stream cleanup. Native printer dialog is used. A comprehensive manual WCAG audit and physical hardware tests are NOT VERIFIED. Existing storefront branding colors are preserved where a wholesale redesign would be outside scope.
