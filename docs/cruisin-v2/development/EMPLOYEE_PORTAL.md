# Employee Portal

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: IMPLEMENTED; desktop/mobile task workflow VERIFIED LOCALLY.

Start independently with `node scripts/v2.mjs employee` (or `employee-built` after build). Use http://127.0.0.1:3194. An administrator creates accounts; there is no employee registration. Local OTP appears only in synthetic development mode. Login redirects to the protected portal; reload bootstraps the server session and a CSRF token.

Routes include dashboard, tasks, orders, inventory, physical units, scanner, SOPs, approvals, exceptions, activity, media and profile. Shared screens use the employee transport and real API. Navigation uses effective grants; backend checks remain authoritative. Tasks, order records, stock, SOPs and evidence are shared with admin.

Unit workflow is accessible from the assigned unit task, unit lookup or inventory. QC/packaging mutations require an active task assigned to the employee. Orders expose fulfillment product details without customer address/payment secrets. Timezone defaults to Asia/Kolkata and employee preference is persisted. Notifications are in-app operational messages, never attendance.

Camera capture, physical printer/scanner output and weighing hardware are NOT VERIFIED. Manual code entry and file upload are implemented for local browser verification.
