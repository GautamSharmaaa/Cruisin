# Order Fulfillment

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

`fulfillment.service.ts` reuses OrderModel, ShipmentModel and LogisticsService. An eligible paid/COD reserved order gets an idempotent unassigned order_packaging task and persistent fulfillment record. Admin assigns it; employee queries authorized product/order fields without customer address/payment secrets. Picking requires an exact RESERVED unit, correct SKU/variant and owning order. Duplicate picks conflict. Package verification requires every unit picked, measurements, a configured courier divisor and private evidence. Record persists across browser reload. Separate actions create mock provider order, assign AWB and generate label. Matching shipment/AWB/document verification identity permits READY_FOR_HANDOVER; explicit handover records HANDED_OVER. Only provider tracking moves to SHIPPED. Existing legacy SKU packing rejects tracked variants.

Detailed implementation record: [development/TASK_MANAGEMENT.md](../development/TASK_MANAGEMENT.md).
