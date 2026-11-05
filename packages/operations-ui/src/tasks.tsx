"use client";
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
  type Sop,
  type PageResult,
} from "@cruisin/contracts";
import { OPS_COPY as C } from "./constants/copy";
import { UnitPanel, type PhysicalUnit } from "./units";
import { SopPanel } from "./sops";
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
export interface TaskFormProps {
  api: OperationsTransport;
  onSaved: () => void;
}
export function TaskForm({ api, onSaved }: TaskFormProps): ReactNode {
  const [units, setUnits] = useState<{ unitId: string; sku: string }[]>([]);
  const [unit, setUnit] = useState("");
  const [staff, setStaff] = useState<{ _id: string; name: string }[]>([]);
  const [orders, setOrders] = useState<{ _id: string; orderNumber?: string }[]>(
    [],
  );
  const [order, setOrder] = useState("");
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependencyOptions, setDependencyOptions] = useState<Task[]>([]);
  const [sops, setSops] = useState<Sop[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sop, setSop] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api
      .get<{ items: typeof units }>("/units?limit=100")
      .then((r) => setUnits(r.items))
      .catch(fail);
    void api
      .get<{ _id: string; orderNumber?: string }[]>("/order-options")
      .then(setOrders)
      .catch(fail);
    void api
      .get<PageResult<Task>>("/tasks?limit=100")
      .then((r) => setDependencyOptions(r.items))
      .catch(fail);
    void api
      .get<{ _id: string; name: string }[]>("/staff-options")
      .then(setStaff)
      .catch(fail);
    void api
      .get<PageResult<Sop>>("/sops?limit=100")
      .then((r) => setSops(r.items.filter((s) => s.status === "PUBLISHED")))
      .catch(fail);
  }, [api]);
  const save = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const title = z.string().min(3).max(160).parse(f.get("title"));
      if (!selected.length) throw new Error(C.formInvalid);
      const due = String(f.get("due") ?? "");
      await api.post("/tasks", {
        title,
        description: f.get("description"),
        category: f.get("category") || "general_operations",
        priority: f.get("priority"),
        assignees: selected,
        ...(due ? { dueAt: new Date(due).toISOString() } : {}),
        ...(sop ? { sop } : {}),
        ...(unit ? { unit } : {}),
        ...(order ? { order } : {}),
        dependencies,
        ...(f.get("sku") ? { sku: f.get("sku") } : {}),
        internalInstructions: f.get("instructions") || "",
        requiresApproval: f.get("approval") === "on",
        checklist: String(f.get("checklist") ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((label) => ({ id: crypto.randomUUID(), label, checked: false })),
      });
      toast.success(C.taskCreated);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : C.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="ui-stack" onSubmit={(e) => void save(e)}>
      <Field label={C.title}>
        <Input name="title" required minLength={3} />
      </Field>
      <Field label={C.description}>
        <Textarea name="description" rows={4} />
      </Field>
      <NativeSelect
        label={C.assignees}
        multiple
        value={selected}
        onChange={setSelected}
        options={staff.map((e) => ({ value: e._id, label: e.name }))}
      />
      <Field label={C.category}>
        <Input
          name="category"
          list="ops-task-categories"
          defaultValue="general_operations"
        />
        <datalist id="ops-task-categories">
          {C.taskCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label={C.priority}>
        <select className="ui-input" name="priority" defaultValue="normal">
          {C.priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label={C.due}>
        <Input name="due" type="datetime-local" />
      </Field>
      <Field label={C.checklist}>
        <Textarea name="checklist" />
      </Field>
      <NativeSelect
        label={C.sop}
        value={sop}
        onChange={(v) => setSop(v[0] ?? "")}
        options={sops.map((s) => ({ value: s._id, label: s.title }))}
      />
      <NativeSelect
        label="Individual unit"
        value={unit}
        onChange={(v) => setUnit(v[0] ?? "")}
        options={units.map((u) => ({
          value: u.unitId,
          label: `${u.sku} · ${u.unitId}`,
        }))}
      />
      <NativeSelect
        label={C.orderId}
        value={order}
        onChange={(v) => setOrder(v[0] ?? "")}
        options={orders.map((o) => ({
          value: o._id,
          label: o.orderNumber ?? C.orders,
        }))}
      />
      <NativeSelect
        label={C.dependencies}
        multiple
        value={dependencies}
        onChange={setDependencies}
        options={dependencyOptions.map((t) => ({
          value: t._id,
          label: t.title,
        }))}
      />
      <Field label={C.sku}>
        <Input name="sku" />
      </Field>
      <Field label={C.instructions}>
        <Textarea name="instructions" />
      </Field>
      <label className="ui-row">
        <input type="checkbox" name="approval" defaultChecked />
        {C.approvalRequired}
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {C.addTask}
      </Button>
    </form>
  );
}
export interface TaskPanelProps {
  initial: Task;
  api: OperationsTransport;
  principal: Principal;
  timezone: string;
  onSaved: () => void;
}
export function TaskPanel({
  initial,
  api,
  principal,
  timezone,
  onSaved,
}: TaskPanelProps): ReactNode {
  const [linkedSop, setLinkedSop] = useState<Sop | null>(null);
  const [task, setTask] = useState(initial);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState<{ _id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState(task.assignees);
  const [linkedUnit, setLinkedUnit] = useState<PhysicalUnit | null>(null);
  const canEdit = principal.permissions.includes("tasks.update");
  useEffect(() => {
    if (
      principal.kind === "admin" &&
      principal.permissions.includes("tasks.assign")
    )
      void api
        .get<{ _id: string; name: string }[]>("/staff-options")
        .then(setStaff)
        .catch(fail);
  }, [api, principal]);
  const mutate = async (
    path: string,
    body: unknown,
    patch = false,
  ): Promise<void> => {
    setBusy(true);
    try {
      const next = patch
        ? await api.patch<Task>(path, body)
        : await api.post<Task>(path, body);
      setTask(next);
      setComment("");
      onSaved();
      toast.success(C.saved);
    } catch (e) {
      setTask(task);
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const transitions: Partial<
    Record<TaskStatus, { status: TaskStatus; label: string }[]>
  > = {
    ASSIGNED: [{ status: "IN_PROGRESS", label: C.start }],
    IN_PROGRESS: [{ status: "SUBMITTED", label: C.submit }],
    REWORK_REQUIRED: [{ status: "IN_PROGRESS", label: C.start }],
    APPROVED: [{ status: "COMPLETED", label: C.complete }],
  };
  return (
    <div className="ui-stack">
      <div className="ui-row">
        <Status>{task.status}</Status>
        <span>{displayTime(task.dueAt, timezone)}</span>
      </div>
      <p>{task.description}</p>
      {task.internalInstructions && <Alert>{task.internalInstructions}</Alert>}
      <div className="ops-checklist">
        {task.checklist.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={item.checked}
              disabled={
                !canEdit ||
                busy ||
                !["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
                  task.status,
                )
              }
              onChange={() => {
                const checklist = task.checklist.map((c) => ({
                  ...c,
                  checked: c.id === item.id ? !c.checked : c.checked,
                }));
                setTask({ ...task, checklist });
                void mutate(
                  `/tasks/${task._id}`,
                  { version: task.version, checklist },
                  true,
                );
              }}
            />
            {item.label}
          </label>
        ))}
      </div>
      {task.unit && (
        <Dialog
          title="Assigned physical unit"
          trigger={
            <Button
              variant="secondary"
              onClick={() =>
                void api
                  .get<PhysicalUnit>(`/units/${task.unit}`)
                  .then(setLinkedUnit)
                  .catch(fail)
              }
            >
              Open assigned unit workflow
            </Button>
          }
        >
          {linkedUnit && (
            <UnitPanel
              unit={linkedUnit}
              api={api}
              principal={principal}
              onSaved={onSaved}
            />
          )}
        </Dialog>
      )}
      {task.sop && (
        <Dialog
          title={C.sop}
          trigger={
            <Button
              variant="secondary"
              onClick={() => {
                void api
                  .get<Sop>(`/sops/${task.sop}`)
                  .then(setLinkedSop)
                  .catch(fail);
              }}
            >
              {C.sop}
            </Button>
          }
        >
          {linkedSop && (
            <SopPanel
              sop={linkedSop}
              api={api}
              principal={principal}
              onSaved={onSaved}
            />
          )}
        </Dialog>
      )}
      {task.order && (
        <a href={`/orders?order=${task.order}&task=${task._id}`}>{C.orders}</a>
      )}
      <AttachmentList ids={task.attachments} api={api} />
      {canEdit &&
        ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
          task.status,
        ) && (
          <FileUpload
            accept="image/*,application/pdf,video/mp4"
            onFile={(file) => {
              void upload(api, file)
                .then((id) =>
                  mutate(
                    `/tasks/${task._id}`,
                    {
                      version: task.version,
                      attachments: [...task.attachments, id],
                    },
                    true,
                  ),
                )
                .catch(fail);
            }}
          />
        )}
      {principal.kind === "admin" &&
        principal.permissions.includes("tasks.create") &&
        ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
          task.status,
        ) && (
          <Dialog
            title={C.edit}
            trigger={<Button variant="secondary">{C.edit}</Button>}
          >
            <form
              className="ui-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void mutate(
                  `/tasks/${task._id}`,
                  {
                    version: task.version,
                    title: String(f.get("title")),
                    description: String(f.get("description")),
                    internalInstructions: String(f.get("instructions")),
                    priority: String(f.get("priority")),
                  },
                  true,
                );
              }}
            >
              <Field label={C.title}>
                <Input
                  name="title"
                  defaultValue={task.title}
                  required
                  minLength={3}
                />
              </Field>
              <Field label={C.description}>
                <Textarea name="description" defaultValue={task.description} />
              </Field>
              <Field label={C.instructions}>
                <Textarea
                  name="instructions"
                  defaultValue={task.internalInstructions}
                />
              </Field>
              <Field label={C.priority}>
                <select
                  className="ui-input"
                  name="priority"
                  defaultValue={task.priority}
                >
                  {C.priorities.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={busy}>
                {C.save}
              </Button>
            </form>
          </Dialog>
        )}
      <Field label={C.reason}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="ui-row">
        {canEdit &&
          transitions[task.status]?.map((t) => (
            <Button
              disabled={busy}
              key={t.status}
              onClick={() =>
                void mutate(`/tasks/${task._id}/transition`, {
                  version: task.version,
                  status: t.status,
                  reason,
                })
              }
            >
              {t.label}
            </Button>
          ))}
        {principal.kind === "admin" &&
          ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
            task.status,
          ) && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void mutate(`/tasks/${task._id}/transition`, {
                  version: task.version,
                  status: "CANCELLED",
                  reason,
                })
              }
            >
              {C.cancel}
            </Button>
          )}
      </div>
      {staff.length > 0 &&
        ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
          task.status,
        ) && (
          <>
            <NativeSelect
              label={C.assignees}
              multiple
              value={assignees}
              onChange={setAssignees}
              options={staff.map((s) => ({ value: s._id, label: s.name }))}
            />
            <Button
              disabled={busy}
              onClick={() =>
                void mutate(
                  `/tasks/${task._id}`,
                  { version: task.version, assignees },
                  true,
                )
              }
            >
              {C.save}
            </Button>
          </>
        )}
      <Card title={C.comment}>
        {task.comments.map((c, i) => (
          <p key={i}>
            {c.text} · {displayTime(c.createdAt, timezone)}
          </p>
        ))}
        {canEdit &&
          ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(
            task.status,
          ) && (
            <>
              <Textarea
                aria-label={C.comment}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                disabled={busy || !comment.trim()}
                onClick={() =>
                  void mutate(
                    `/tasks/${task._id}`,
                    { version: task.version, comment },
                    true,
                  )
                }
              >
                {C.addComment}
              </Button>
            </>
          )}
      </Card>
      <Card title={C.history}>
        <div className="ops-history">
          {task.history.map((h, i) => (
            <div key={i}>
              <Status>{h.to}</Status>
              <p>{h.reason}</p>
              <p className="ops-muted">{displayTime(h.at, timezone)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
