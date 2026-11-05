# Approval Engine

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: IMPLEMENTED; concurrency and self-review checks VERIFIED LOCALLY.

ApprovalRequest records capture kind, requester, entity/version, proposed change, reason, evidence, status, reviewer, decision and comments. Supported task completion, stock correction, inspection result, order exception note and SOP change suggestion workflows use one engine.

Requests cannot be self-approved. Assigned task workers cannot approve their own work. A review transaction claims the pending approval and revalidates entity version. Stock approval executes through the inventory domain service; stale counts/revisions fail without changing stock. Published SOP suggestions update a draft rather than overwriting publication history. Inspection decisions record the review; generic order exceptions append an approved note and cannot mutate payment/shipping state.

Operational exceptions have a separate persisted queue with issue type, severity, reporter, entity, evidence, owner, status and resolution. Resolving an exception records a reason and audit event but does not silently release quarantined units or override stock. Product/packaging publication, QC rework, and quarantine/damage disposition use independent version-bound reviews. Removing packed available inventory is applied exactly once through the unit stock service after approval.
