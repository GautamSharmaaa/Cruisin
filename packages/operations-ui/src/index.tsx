"use client";
import { ApprovalForm } from "./approval-form";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import {
  Button,
  Card,
  Input,
  Textarea,
  Field,
  Alert,
  Status,
  Skeleton,
  Dialog,
  DataTable,
  Pagination,
  FileUpload,
  ConfirmationDialog,
  toast,
} from "@cruisin/ui";
import {
  employeeRoles,
  permissions,
  type Principal,
  type Employee,
  type Task,
  type TaskStatus,
  type Approval,
  type InventoryRow,
  type PageResult,
} from "@cruisin/contracts";
import { OPS_COPY as C } from "./constants/copy";
import { Scanner } from "./scanner";
import type { OperationsTransport } from "./api";
import {
  useList,
  NativeSelect,
  AttachmentList,
  upload,
  displayTime,
  fail,
} from "./common";
import { EmployeeEditor } from "./employees";
import { TaskForm, TaskPanel } from "./tasks";
import { ApprovalPanel } from "./approvals";
import { InventoryProducts } from "./inventory-products";
import { INVENTORY_COPY as I } from "./constants/inventory-copy";
import { SopWorkspace } from "./sop-workspace";
import { Exceptions } from "./exceptions";
import { UnitPanel, type PhysicalUnit, Units } from "./units";
import { Fulfillment } from "./fulfillment";
import { Packing } from "./packing";
import { Profile } from "./profile";
import { NotificationList } from "./notifications";
import { MediaUpload } from "./media";
export type { OperationsTransport } from "./api";
export { OPS_COPY } from "./constants/copy";
export type OperationsModule =
  | "exceptions"
  | "fulfillment"
  | "units"
  | "dashboard"
  | "tasks"
  | "employees"
  | "approvals"
  | "inventory"
  | "scanner"
  | "sops"
  | "activity"
  | "profile"
  | "orders"
  | "media";
export interface OperationsPageProps {
  module: OperationsModule;
  transport: OperationsTransport;
  principal: Principal;
  timezone?: string;
  description?: string;
  onLogout?: () => Promise<void>;
}
export function OperationsPage({
  module,
  transport: api,
  principal,
  timezone = "Asia/Kolkata",
  description,
  onLogout,
}: OperationsPageProps): ReactNode {
  const [resolvedUnit, setResolvedUnit] = useState<PhysicalUnit | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [summaryRevision, setSummaryRevision] = useState(0);
  const [summary, setSummary] = useState<{
    tasks: { active: number; overdue: number };
    pendingApprovals: number;
    lowStockVariants: number;
    unitStates: { _id: string; count: number }[];
    openExceptions: number;
    unreadNotifications: number;
    fulfillment: {awaitingPacking:number; packed:number; readyForHandover:number} | null;
  } | null>(null);
  useEffect(() => {
    if (module !== "dashboard") return;
    let active = true;
    setSummaryError("");
    setSummary(null);
    void api.get<NonNullable<typeof summary>>("/summary")
      .then((result) => { if (active) setSummary(result); })
      .catch((error: unknown) => { if (active) setSummaryError(error instanceof Error ? error.message : C.error); });
    return () => { active = false; };
  }, [api, module, summaryRevision]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const path =
    module === "dashboard"
      ? "/tasks"
      : module === "scanner"
        ? "/inventory"
        : module === "orders"
          ? "/tasks"
          : module === "profile"
            ? "/notifications"
            : `/${module}`;
  const list = useList<Record<string, unknown>>(api, module === "sops" ? "" : path, q, status, page);
  const reload = list.reload;
  let content: ReactNode = null;
  if (module === "scanner") {
    content = (
      <Card title={C.scanner}>
        <Scanner
          onScan={async (code) => {
            if (code.startsWith("cruisin:unit:") || code.startsWith("CU-")) {
              const unit = await api.get<PhysicalUnit>(
                `/units/${encodeURIComponent(code)}`,
              );
              setResolvedUnit(unit);
              toast.success(`${unit.sku} · ${unit.state}`);
              return;
            }
            const result = await api.post<InventoryRow>("/inventory/scan", {
              code,
            });
            toast.success(`${result.sku} · ${result.size} · ${result.color}`);
            setResolved(result);
          }}
        />
        {resolvedUnit && (
          <UnitPanel
            unit={resolvedUnit}
            api={api}
            principal={principal}
            onSaved={() => undefined}
          />
        )}
      </Card>
    );
  }
  const [resolved, setResolved] = useState<InventoryRow | null>(null);
  if (module === "orders" || module === "fulfillment")
    content = (
      <>
        <Fulfillment api={api} principal={principal} timezone={timezone} />
        <Packing api={api} />
      </>
    );
  if (module === "exceptions")
    content = <Exceptions api={api} principal={principal} />;
  if (module === "units") content = <Units api={api} principal={principal} />;
  if (module === "profile")
    content = <Profile api={api} timezone={timezone} onLogout={onLogout} />;
  const taskItems = (list.data?.items ?? []) as unknown as Task[];
  if (module === "dashboard")
    content = (
      <>
        {summaryError ? <Alert tone="danger">{summaryError}</Alert> : summary ? (
          <Card title={C.operationalSummary}>
            <div className="ops-metrics">
              {[
                [C.activeTasks, summary.tasks.active],
                [C.overdueTasks, summary.tasks.overdue],
                [C.pendingApprovals, summary.pendingApprovals],
                [C.openExceptions, summary.openExceptions],
                [C.unreadNotifications, summary.unreadNotifications],
                ...(summary.fulfillment ? [
                  [C.awaitingPacking, summary.fulfillment.awaitingPacking],
                  [C.packedOrders, summary.fulfillment.packed],
                  [C.readyForHandover, summary.fulfillment.readyForHandover],
                ] : []),
                ...(principal.permissions.includes("inventory.view") ? [[C.lowStockVariants, summary.lowStockVariants]] : []),
              ].map(([label, value]) => (
                <dl className="ops-metric" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </dl>
              ))}
            </div>
            {principal.permissions.includes("inventory.view") && (
              <DataTable
                caption={C.unitStates}
                items={summary.unitStates}
                keyOf={(r) => r._id}
                columns={[
                  { key: "state", label: C.status, render: (r) => r._id },
                  { key: "count", label: C.quantity, render: (r) => r.count },
                ]}
              />
            )}
          </Card>
        ) : (
          <Skeleton />
        )}
        <Card title={C.welcome}>
          <p>{C.welcomeDescription}</p>
          <div className="ui-row">
            <a className="ui-button ui-button-primary" href="/tasks">
              {C.viewTasks}
            </a>
            {summary && <Status>{summary.tasks.active} {C.tasks}</Status>}
          </div>
        </Card>
        <NotificationList key={summaryRevision} api={api} timezone={timezone} />
      </>
    );
  if (list.data && module === "tasks")
    content = (
      <DataTable<Task>
        caption={principal.kind === "admin" ? C.adminTasks : C.tasks}
        items={taskItems}
        keyOf={(t) => t._id}
        columns={[
          {
            key: "title",
            label: C.title,
            render: (t) => <strong>{t.title}</strong>,
          },
          {
            key: "status",
            label: C.status,
            render: (t) => <Status>{t.status}</Status>,
          },
          { key: "priority", label: C.priority, render: (t) => t.priority },
          {
            key: "due",
            label: C.due,
            render: (t) => displayTime(t.dueAt, timezone),
          },
          {
            key: "actions",
            label: C.details,
            render: (t) => (
              <Dialog
                title={t.title}
                trigger={<Button variant="secondary">{C.details}</Button>}
              >
                <TaskPanel
                  initial={t}
                  api={api}
                  principal={principal}
                  timezone={timezone}
                  onSaved={reload}
                />
              </Dialog>
            ),
          },
        ]}
      />
    );
  if (list.data && module === "employees")
    content = (
      <DataTable<Employee>
        caption={C.employees}
        items={list.data.items as unknown as Employee[]}
        keyOf={(e) => e._id}
        columns={[
          { key: "id", label: C.employeeId, render: (e) => e.employeeId },
          { key: "name", label: C.name, render: (e) => e.name },
          { key: "phone", label: C.phone, render: (e) => e.phone },
          {
            key: "role",
            label: C.role,
            render: (e) => e.role.replaceAll("_", " "),
          },
          {
            key: "active",
            label: C.status,
            render: (e) => <Status>{e.active ? C.active : C.denied}</Status>,
          },
          {
            key: "actions",
            label: C.edit,
            render: (e) => (
              <Dialog
                title={e.name}
                trigger={<Button variant="secondary">{C.edit}</Button>}
              >
                <EmployeeEditor employee={e} api={api} onSaved={reload} />
              </Dialog>
            ),
          },
        ]}
      />
    );
  if (list.data && module === "approvals")
    content = (
      <DataTable<Approval>
        caption={C.approvals}
        items={list.data.items as unknown as Approval[]}
        keyOf={(r) => r._id}
        columns={[
          { key: "kind", label: C.kind, render: (r) => r.kind },
          { key: "reason", label: C.reason, render: (r) => r.reason },
          {
            key: "status",
            label: C.status,
            render: (r) => <Status>{r.status}</Status>,
          },
          {
            key: "review",
            label: C.details,
            render: (r) => (
              <Dialog
                title={C.approvals}
                trigger={<Button variant="secondary">{C.details}</Button>}
              >
                <ApprovalPanel
                  request={r}
                  timezone={timezone}
                  api={api}
                  principal={principal}
                  onSaved={reload}
                />
              </Dialog>
            ),
          },
        ]}
      />
    );
  if (list.data && module === "inventory")
    content = <InventoryProducts data={list.data as unknown as PageResult<InventoryRow>} api={api} principal={principal} timezone={timezone} onSaved={reload} />;
  if (list.data && module === "activity")
    content = (
      <DataTable
        caption={C.activity}
        items={list.data.items}
        keyOf={(r) => String(r._id)}
        columns={[
          {
            key: "at",
            label: C.timestamp,
            render: (r) => displayTime(String(r.at), timezone),
          },
          { key: "action", label: C.action, render: (r) => String(r.action) },
          {
            key: "summary",
            label: C.description,
            render: (r) => String(r.summary),
          },
          { key: "result", label: C.result, render: (r) => String(r.result) },
        ]}
      />
    );
  if (list.data && module === "media")
    content = (
      <>
        <MediaUpload api={api} principal={principal} onSaved={reload} />
        <DataTable
          caption={C.media}
          items={list.data.items}
          keyOf={(r) => String(r._id)}
          columns={[
            { key: "name", label: C.name, render: (r) => String(r.name) },
            {
              key: "type",
              label: C.kind,
              render: (r) => String(r.contentType),
            },
            {
              key: "visibility",
              label: C.visibility,
              render: (r) => <Status>{String(r.visibility)}</Status>,
            },
            {
              key: "file",
              label: C.attachments,
              render: (r) => <AttachmentList ids={[String(r._id)]} api={api} />,
            },
            {
              key: "delete",
              label: C.delete,
              render: (r) => (
                <ConfirmationDialog
                  title={C.confirmDelete}
                  description={C.confirmDescription}
                  trigger={<Button variant="danger">{C.delete}</Button>}
                  onConfirm={() => {
                    void api
                      .delete(`/media/${String(r._id)}`)
                      .then(reload)
                      .catch(fail);
                  }}
                />
              ),
            },
          ]}
        />
      </>
    );
  if (module === "sops") return (
    <SopWorkspace api={api} principal={principal} description={description} />
  );
  return (
    <div className="ui-stack">
      <header className="ops-heading">
        <div>
          <p className="ops-eyebrow">{C.eyebrow}</p>
          <h1>
            {module === "tasks" && principal.kind === "admin"
              ? C.adminTasks
              : C[module]}
          </h1>
          {description && <p className="ops-description">{description}</p>}
        </div>
        <div className="ui-row">
          {module === "approvals" &&
            (principal.permissions.includes("inventory.count") ||
              principal.permissions.includes("orders.view")) && (
              <Dialog
                title={C.requestApproval}
                trigger={<Button>{C.requestApproval}</Button>}
              >
                <ApprovalForm api={api} onSaved={reload} />
              </Dialog>
            )}
          {module === "employees" &&
            principal.permissions.includes("employees.manage") && (
              <Dialog
                title={C.addEmployee}
                trigger={<Button>{C.addEmployee}</Button>}
              >
                <EmployeeEditor api={api} onSaved={reload} />
              </Dialog>
            )}
          {module === "tasks" &&
            principal.kind === "admin" &&
            principal.permissions.includes("tasks.create") && (
              <Dialog title={C.addTask} trigger={<Button>{C.addTask}</Button>}>
                <TaskForm api={api} onSaved={reload} />
              </Dialog>
            )}
          <Button variant="ghost" onClick={() => { reload(); setSummaryRevision(r => r + 1); }}>
            {C.refresh}
          </Button>
        </div>
      </header>
      {!["dashboard", "orders", "scanner", "profile"].includes(module) && (
        <div className="ui-row ops-list-toolbar">
          <Input
            aria-label={C.search}
            placeholder={module === "inventory" ? I.search : C.search}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          {["tasks", "approvals"].includes(module) && (
            <NativeSelect
              label={C.status}
              value={status}
              onChange={(v) => {
                setStatus(v[0] ?? "");
                setPage(1);
              }}
              options={(module === "tasks"
                ? C.taskStatuses
                : [
                    "PENDING",
                    "APPROVED",
                    "REJECTED",
                    "REWORK_REQUIRED",
                    "CANCELLED",
                  ]
              ).map((s) => ({ value: s, label: s }))}
            />
          )}
        </div>
      )}
      {list.error && <Alert tone="danger">{list.error}</Alert>}
      {!list.data && !list.error && !content && <Skeleton />}
      {content}
      {resolved && module === "scanner" && (
        <Card title={C.countResult}>
          <strong>{resolved.sku}</strong>
          <p>
            {resolved.size} · {resolved.color}
          </p>
          <p>
            {C.stock}: {resolved.available}
          </p>
        </Card>
      )}
      {list.data &&
        list.data.items.length === 0 &&
        !["dashboard", "orders", "scanner", "profile", "media"].includes(
          module,
        ) && <Alert>{C.empty}</Alert>}
      {list.data &&
        !["dashboard", "orders", "scanner", "profile"].includes(module) && (
          <Pagination page={page} pages={list.data.pages} onChange={setPage} />
        )}
    </div>
  );
}
