# Rbac Permissions

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Detailed implementation record: [development/ROLE_PERMISSIONS.md](../development/ROLE_PERMISSIONS.md).

Status: IMPLEMENTED. Source of truth: `packages/contracts/index.js` and `.d.ts`.

Existing admin/superadmin identity is reused, with a fresh active user lookup. Employee roles provide defaults: operations manager, inventory manager, warehouse employee, packaging employee, read-only employee. Explicit grants/denials are resolved server-side and applied immediately. New unit receiving/QC/shipping actions have distinct permissions (`inventory.receive`, `units.generate`, `units.scan`, `qc.perform`, `shipping.prepare`). Existing task, stock, order and SOP permissions remain compatible.

Administrators alone create employees and change security-sensitive account configuration. Employees cannot promote themselves. Task readers are scoped to assignments, creators with assignment permission, or authorized reviewers. Unit inspection/packaging requires an active assigned unit/order task. Order views expose authorized order details only. Media access depends on owner/public visibility or an authorized task/SOP/review association. Generic exceptions do not bypass domain rules.

Independent approval excludes requester and task assignees and rechecks version. An inventory manager does not receive task-approval permission by default. Tests cover wrong employee IDs, stale privileges, inactive sessions, self approval and unauthorized media. Real organizational role mapping must be reviewed before deployment.
