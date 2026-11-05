# Product Qc

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

`POST /units/:code/qc` checks `qc.perform`, assignment, state/version, product-specific PRODUCT publication, completed mandatory requirements and private evidence. PASSED→PACKAGING_PENDING; FAILED→QC_FAILED; REVIEW_REQUIRED→QUARANTINED. Employees and administrators cannot clear failed/quarantined state without independent rework approval. QC retains actor, SOP version, measurement map, result, evidence and timestamp. Published administrator measurement bounds are enforced before QC can pass. Failed/quarantined QC requires independent rework approval; recording a decision cannot create available stock.

Detailed implementation record: [development/INVENTORY_SYSTEM.md](../development/INVENTORY_SYSTEM.md).
