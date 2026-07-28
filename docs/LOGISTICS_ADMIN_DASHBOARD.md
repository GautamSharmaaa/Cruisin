# Logistics Admin Dashboard

The dashboard adds six focused operations surfaces while preserving the existing shell and role model.

## Logistics control center

`/logistics` shows:

- total, ready, in-transit, delivered, NDR, RTO, and error KPIs;
- shipping cost, delivery, NDR, and RTO rates;
- server-side status/type/search filters;
- order/customer, courier/AWB, parcel measurement, cost, error, and update columns;
- contextual create, AWB, pickup, tracking, label, invoice, manifest, and Print Label actions;
- failed/partial customer logistics-notification visibility.

Package warnings remain visible until measurements are confirmed. Document generation has loading, expiry-aware success, and visible failure states. Provider errors are not replaced with generic success states.

## Logistics analytics

`/logistics/analytics` reads persisted shipment data only. It includes daily volume/cost, courier shipment/delivery/NDR counts, courier cost, and status mix for 7/30/90-day windows.

Provider cost and customer shipping charge are separate fields. Analytics does not treat the amount charged to the customer as the provider’s actual cost.

## NDR manager

`/logistics/ndr` prioritizes delivery exceptions and exposes guarded reattempt, address/phone correction notes, availability confirmation, customer contact, escalation, and RTO actions. Duplicate active reattempts and identical consecutive actions are ignored. Every accepted action records admin identity and time.

## RTO manager

`/logistics/rto` follows all return-to-origin states and exposes warehouse receipt plus pass/damaged inspection actions. Receipt must precede inspection. Passing inspection restores stock once; damage does not restore stock. Inventory failure remains visible for manual review.

## Returns

`/returns` supports request review, more information, approval/rejection, reverse pickup, warehouse receipt, quality check, refund handoff, refund confirmation, and closure. Shiprocket does not issue the payment refund; the existing Razorpay admin operation remains the money-movement boundary.

## Exchanges

`/exchanges` reserves the requested variant atomically, creates reverse pickup, records warehouse quality control, creates and assigns the replacement shipment, and completes/closes the request. A failed quality check releases reserved replacement stock.

## Order detail

Each admin order includes a Shipping operations panel. It creates a local draft/provider order only for payment-authorized or COD-placed orders and links logistics without changing payment controls.

Product edit → Shipping & Attributes maintains measured product weight, packed length/breadth/height, packaging weight, default package-preset code, and maximum quantity per package.

## Known first-release boundaries

- The control center exposes the implemented status/type/search API but its first UI release presents status and text search; additional compound filters remain an operations enhancement.
- Analytics uses persisted shipment costs and currently presents daily cost/volume, courier scorecards, and status mix. Missing historical provider costs remain unavailable rather than being inferred.
- Package preset records are supported by the calculator/model; preset CRUD is not exposed as a separate dashboard page.
- Return money movement remains in the existing Razorpay order panel. The return queue records QC and refund handoff/status but never marks provider money as moved on its own.
- NDR address and phone actions are audited operational notes; they do not silently mutate the customer’s saved order address.
- Print Label opens the browser print flow. Direct physical or thermal-printer control requires a separate local print agent and is not implemented.

## Roles

| Role | Read | Shipment actions | Inventory recovery/refund |
| --- | --- | --- | --- |
| viewer | yes | no | no |
| manager | yes | yes | no |
| admin | yes | yes | yes |
| superadmin | yes | yes | yes |

Use the dedicated logistics status instead of manually marking the commerce order shipped. Payment and fulfilment are deliberately independent.
