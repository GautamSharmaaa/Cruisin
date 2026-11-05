# Api Contracts

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Route prefixes: admin `/api/v1/admin/operations`, employee `/api/v1/employee`. Protected lists: employees(admin), tasks, approvals, inventory, units, SOPs, activity, notifications, exceptions, fulfillment. Mutations: employee create/update/revoke; task create/patch/transition/comment; approval review; inventory adjustment/scan; unit receive/qc/package/pick/return; SOP create/update/publish/ack/suggest; media upload/access/delete; parcel measure/shipping/ready/handover; exception report/resolve; courier/label configuration. All return ApiResponse envelopes. IDs and query/page inputs are validated. CAS inputs carry version; stale state returns409. `/units/:code` accepts opaque QR/immutable unit identifier, not arbitrary customer records. Shared frontend DTOs are in packages/contracts; full physical schemas live beside backend validators.

Detailed implementation record: [development/ARCHITECTURE.md](../development/ARCHITECTURE.md).

`GET /summary` now also returns `openExceptions`, `unreadNotifications`, and `fulfillment: {awaitingPacking, packed, readyForHandover}`. Fulfillment is null without `orders.view`; employees receive only counts of their assigned active fulfillment orders, deduplicated by order. Terminal tasks are excluded. Exceptions match reporter/owner scope and exclude resolved records. Unit-state counts require `inventory.view`. Notification lists use stable creation-time/ID sorting and the standard page/limit envelope.
