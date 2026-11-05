# Task Management

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/TASK_MANAGEMENT.md](../development/TASK_MANAGEMENT.md).

Status: IMPLEMENTED; cross-application task completion VERIFIED LOCALLY.

Admin creates tasks, assigns one or more active employees, selects category/priority/deadline, adds checklist, SOP, SKU/order/unit/dependency, instructions and attachments. Existing records are reused. Employee can start work, update assigned checklists, comment, attach evidence and submit. Admin can reassign, edit permitted metadata, cancel and review. Activity includes actor, correlation and timestamps.

State machine: ASSIGNED→IN_PROGRESS→SUBMITTED→APPROVED→COMPLETED; SUBMITTED→REWORK_REQUIRED→IN_PROGRESS; active work can be cancelled by an administrator. Invalid transitions and stale versions return conflicts. Submitting requires completed checklist and dependencies. Review-required work creates a version-bound approval. Review-free work may complete after validation. Physical fulfillment additionally has its own domain checks and cannot create stock from checkboxes.

Assignment/reassignment/update/submission/review/rework/cancellation and deadline notices are deduplicated persistent in-app notifications. Task lists support pagination, search, status and overdue filters. Dependency cycles are rejected. Automatic order fulfillment tasks have a unique fulfillment key and can remain unassigned until admin assignment.

Relevant sources: employee-task.model.ts, employee-task.service.ts, operations.routes.ts and shared tasks.tsx. UTC persists, selected timezone displays.
