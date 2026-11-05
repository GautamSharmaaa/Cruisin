# Returns

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/INVENTORY_SYSTEM.md](../development/INVENTORY_SYSTEM.md).

Status: IMPLEMENTED for aggregate compatibility and tracked local unit workflows.

`Product.variants[].stock` remains authoritative storefront availability. Immutable stock movements record deltas, before/after, actor, reason, reference and idempotency. Opening balance backfill is additive and idempotent; it computes current stock minus existing ledger deltas, rejects inconsistent negative reconciliation and bumps the revision under a transaction. Direct stock edits to existing variants in product forms/CSV are rejected; approved counts are required. New variant receipts are logged.

Physical units are opt-in for a zero-stock variant with no active aggregate reservations. Converting nonzero legacy stock is deliberately rejected pending an explicit reviewed physical count/conversion. Receiving creates QC_PENDING units and zero available stock. QC PASSED enters PACKAGING_PENDING; required packaging steps, private evidence and exact unique-label scan permit PACKED_AVAILABLE and a +1 authoritative movement. Reprints never create units/stock.

Checkout transactions reserve aggregate stock and exact eligible units together. Physical state becomes RESERVED, with one order identity; picking only accepts that order's reserved unit and matching variant/SKU. Cancellation releases eligible units with aggregate stock. Shipping does not deduct stock twice. Quantity-only corrections to tracked variants are denied. Reconciliation compares packed units with commerce availability; other unit states remain visible operationally.

Inspected customer returns require original order/variant association. Repackage disposition returns units to QC, not sellable stock. Duplicate disposition is rejected. Tracked RTO recovery also returns to QC/repackaging. Tracked exchange replacement links to an eligible same-customer order and its already reserved units, without deducting stock twice. Duplicate linkage/allocation is rejected. Linked replacements use the normal picking/packing/handover workflow; a failed inspection requires authorized cancellation before releasing a linked reserved order. Legacy aggregate exchange/RTO concurrency is tested.

Unit states and allocation are distinct from external shipment state. Shipment AWB and unit QR remain separate. Camera/printer hardware and production legacy conversion are NOT VERIFIED.
