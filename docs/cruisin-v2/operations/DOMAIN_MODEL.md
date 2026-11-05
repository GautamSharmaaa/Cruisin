# Domain Model

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Products own variants. PhysicalUnit references one immutable product/variant/SKU and receipt. Stock availability is the variant's packed/unreserved quantity. Receipt is idempotent. Unit QC and packaging retain publication ID/version. Allocation associates a unit with one order; fulfillment record links the order/task, scanned units, measurement policy snapshot, evidence and shipment/AWB. Immutable history retains past business references. Employee and customer identities are deliberately separate.

Detailed implementation record: [development/ARCHITECTURE.md](../development/ARCHITECTURE.md).
