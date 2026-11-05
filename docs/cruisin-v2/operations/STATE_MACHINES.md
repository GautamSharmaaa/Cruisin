# State Machines

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Unit: QC_PENDING→PACKAGING_PENDING (QC passed)→PACKED_AVAILABLE (verified SOP/evidence/scan)→RESERVED (checkout)→PICKED→PACKED_FOR_SHIPMENT→READY_FOR_HANDOVER→HANDED_OVER→SHIPPED (provider confirmation). Failed QC→QC_FAILED or QUARANTINED; no sellable stock. An authorized inspected return→QC_PENDING/QUARANTINED/DAMAGED/RETURNED_TO_VENDOR, with new QC+packaging needed before availability. Eligible cancelled allocation may release to PACKED_AVAILABLE; dispatched units require reviewed recovery. Fulfillment stage is separate from shipment carrier status. SOP draft revisions and immutable publications are separate. Approval PENDING can become APPROVED/REJECTED/REWORK_REQUIRED/CANCELLED once under version checks.

Detailed implementation record: [development/TASK_MANAGEMENT.md](../development/TASK_MANAGEMENT.md).
