# Admin Promotion Experience

The Promotion Experience highlights one existing CRUISIN coupon across browsing, Bag and Checkout. It does not create or calculate a discount. Coupon eligibility and final prices continue to come from the existing commerce backend.

The feature ships **OFF by default**.

## Admin usage

Open:

`CRUISIN Admin → Discounts → Promotional Experience`

The control panel appears above coupon creation and the coupon list.

### Enable or disable everything

Use **Promotional Experience** as the master switch, then choose **Save changes**.

- OFF suppresses the automatic popup, Bag marquee and Checkout strip.
- OFF does not disable the linked coupon and does not change the manual coupon field.
- ON evaluates the placement switches, campaign schedule and linked coupon status.

### Link an offer

Choose an existing entry from **Promotion / coupon**. The panel shows its technical state, date range, usage, minimum amount and whether it has targeted eligibility.

The customer experience is automatically suppressed if the linked coupon is missing, disabled, expired, not started or exhausted. Admin may save an inactive link for preparation, but it will not be advertised to customers.

Coupon rules remain managed in the normal Discounts coupon form/list. The Promotion Experience does not duplicate them.

### Configure placements

The three placement switches work independently when the master switch is ON:

- **Promotion Popup** — automatic browsing/PDP bottom sheet or desktop dialog.
- **Bag Marquee** — `/cart` and the Cart Drawer.
- **Checkout Strip** — the authenticated `/checkout` page.

Turning off only Popup leaves the Bag and Checkout placements active.

### Configure campaign identity

- **Campaign name** is internal and is never returned by the public API.
- **Campaign key** identifies frequency storage and analytics. Use lowercase letters, numbers and hyphens. Change it for a genuinely new campaign so a customer who dismissed an older campaign can see the new one.

### Configure popup

Edit eyebrow, headline, description, primary CTA and secondary CTA.

Popup delay accepts `0` through `30000` milliseconds. The default is `2500`.

Frequency options:

- **Once per session** uses campaign-specific `sessionStorage`.
- **Once every 24 hours** uses a campaign-specific timestamp in `localStorage`.
- **Always** means once per eligible route context during the current application visit; it does not reopen on a rerender.

The popup is limited to discovery routes. It is suppressed on Bag, Checkout, checkout pending/success/failure, while Cart/search is open, when another dialog is active, and when the linked coupon is already applied.

### Configure Bag and Checkout copy

Available and applied states are independently editable. Copy is plain text only. Supported placeholders are:

- `{{code}}` — linked coupon code.
- `{{discount}}` — percentage, fixed amount or free-shipping label.
- `{{saving}}` — actual server-confirmed monetary saving, or free shipping when appropriate.

Any other or malformed placeholder is rejected by the Admin API. No HTML or template evaluation is used.

### Configure scheduling

Use **Starts at** and **Ends at**. Admin inputs are interpreted in the browser's local timezone, converted to ISO/UTC instants and stored as MongoDB dates. End must be after start.

The status pill reports:

- Live
- Scheduled
- Disabled
- Expired
- Linked offer inactive

### Preview

Use the Popup, Bag marquee and Checkout strip preview tabs, then switch between Available and Applied. Preview uses representative saving copy only; it never modifies a customer cart and never calls the coupon endpoint.

### Save feedback and unsaved changes

The sticky action bar reports Saving, Saved, failed, and unsaved states. A browser-leave warning is registered while the form is dirty. Viewers can inspect configuration but cannot save; manager/admin/superadmin roles can save under the existing role policy.

## Storefront flow

```text
Landing / shop / PDP
        ↓
Popup after configured delay
        ↓
Copy, apply through server, or dismiss
        ↓
Bag page / Cart Drawer
        ↓
Available or applied marquee
        ↓
Checkout
        ↓
Available or applied static strip
        ↓
Existing delivery and payment flow
```

All apply actions call the same shared storefront function. That function synchronizes the current local Bag to the server, calls `POST /api/v1/cart/coupon`, and updates the existing Zustand `cruisin-cart` coupon state only after a successful server response. The manual coupon field uses the same function.

The applied state therefore remains synchronized between:

- popup;
- Bag marquee;
- Checkout strip;
- manual coupon field;
- Bag totals;
- Checkout order summary.

Changing Bag items uses the existing cart behavior and clears the coupon so it can be revalidated.

If the Bag is empty, popup application returns the real safe server failure and does not create a fake pending/applied discount. Customers can copy the code or apply it after adding eligible items.

## Architecture

### Database model

The feature extends the existing singleton `SiteSettings` MongoDB document with a nested `promotionExperience` subdocument. It does not add a collection. Existing documents without the field evaluate against OFF-by-default service defaults.

`promotionId` references the existing Coupon collection.

### APIs

- `GET /api/v1/promotion-experience` — public, no-store, returns an active public-safe representation or `null`.
- `GET /api/v1/admin/promotion-experience` — protected Admin configuration, linked coupon summary and calculated status.
- `PUT /api/v1/admin/promotion-experience` — protected manager/admin/superadmin update.
- `POST /api/v1/cart/coupon` — unchanged authoritative coupon-apply endpoint used by every storefront placement.

The legacy public `/site-settings` response explicitly excludes `promotionExperience`, preventing internal campaign name, Admin updater and inactive copy from leaking through that endpoint.

### Active evaluation

`PromotionExperienceService` is the single backend evaluator. Public output requires:

```text
master enabled
AND within campaign schedule
AND linked coupon exists
AND linked coupon enabled
AND within coupon schedule
AND coupon usage not exhausted
```

Placement components consume the already-evaluated response and only inspect their placement switch.

### Coupon and pricing authority

`calculateCouponDiscount` remains authoritative for eligibility, minimum amount, targeting, caps, validity and calculated saving. Final COD, partial and Razorpay order creation independently reloads and recalculates the coupon on the server. The feature contains no frontend discount calculator and does not change shipping, GST/tax, COD fee, payment order, verification or order creation logic.

### Caching

Promotion public/Admin responses send `Cache-Control: no-store`. The storefront React Query hook treats data as immediately stale, refetches when the window regains focus and polls every 60 seconds.

An Admin change is therefore visible:

- immediately on a new request or focus refetch;
- within at most 60 seconds in an open storefront tab.

Other CRUISIN caches are unchanged.

### Failure behavior

Configuration fetch failures return no marketing UI. Store, Cart, Checkout, payment and manual coupons remain available. Apply failures use safe customer copy and never block payment.

### Accessibility and motion

- Radix Dialog provides modal semantics, focus trap, Escape handling and focus restoration.
- The close control has an accessible label and all interactive placements use buttons.
- Mobile uses a safe-area-aware bottom sheet; desktop uses a constrained centered modal.
- The Bag marquee uses a 22-second linear track.
- `prefers-reduced-motion: reduce` stops the marquee and collapses repeated visual copy to one static item.

### Analytics

Promotion events use the existing Meta Pixel runtime as custom events and also dispatch a `cruisin:analytics` browser integration event. Only campaign key, coupon/promotion identifiers, placement, cart amount/item count, state and saving are included.

Impressions use session and in-memory dedupe to withstand React Strict Mode and remounts. Promotion actions never emit Meta `AddToCart`, `InitiateCheckout`, `AddPaymentInfo` or `Purchase`.

Events:

- `promotion_popup_impression`
- `promotion_popup_dismiss`
- `promotion_popup_copy`
- `promotion_popup_apply_attempt`
- `promotion_popup_apply_success`
- `promotion_popup_apply_failure`
- `promotion_marquee_impression`
- `promotion_marquee_click`
- `promotion_marquee_apply_success`
- `promotion_marquee_apply_failure`
- `checkout_promotion_impression`
- `checkout_promotion_click`
- `checkout_promotion_apply_success`
- `checkout_promotion_apply_failure`

## Emergency disable

```text
CRUISIN Admin
→ Discounts
→ Promotional Experience
→ Promotional Experience OFF
→ Save changes
```

No deployment or storefront rebuild is required. New requests stop receiving marketing configuration immediately; already open tabs remove it on focus or within 60 seconds. Manual coupon functionality remains available according to normal coupon status.
