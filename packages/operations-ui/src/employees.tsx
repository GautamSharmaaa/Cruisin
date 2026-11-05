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
export interface EmployeeEditorProps {
  employee?: Employee;
  api: OperationsTransport;
  onSaved: () => void;
}
export function EmployeeEditor({
  employee,
  api,
  onSaved,
}: EmployeeEditorProps): ReactNode {
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [role, setRole] = useState(employee?.role ?? "readonly_employee");
  const [active, setActive] = useState(employee?.active ?? true);
  const [grants, setGrants] = useState<string[]>(employee?.grants ?? []);
  const [denials, setDenials] = useState<string[]>(employee?.denials ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const value = z
        .object({
          name: z.string().min(2).max(80),
          phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
          role: z.enum(employeeRoles),
        })
        .parse({ name, phone, role });
      if (employee)
        await api.patch(`/employees/${employee._id}`, {
          ...value,
          active,
          grants,
          denials,
          version: employee.version,
        });
      else await api.post("/employees", { ...value, grants, denials });
      toast.success(C.saved);
      onSaved();
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? C.formInvalid
          : err instanceof Error
            ? err.message
            : C.error,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="ui-stack" onSubmit={(e) => void save(e)}>
      <Field label={C.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </Field>
      <Field label={C.phone}>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </Field>
      <NativeSelect
        label={C.role}
        value={role}
        onChange={(v) => setRole(v[0] as Employee["role"])}
        options={employeeRoles.map((r) => ({
          value: r,
          label: r.replaceAll("_", " "),
        }))}
      />
      <NativeSelect
        multiple
        label={C.permissions}
        value={grants}
        onChange={setGrants}
        options={permissions.map((p) => ({ value: p, label: p }))}
      />
      <NativeSelect
        multiple
        label={C.denials}
        value={denials}
        onChange={setDenials}
        options={permissions.map((p) => ({ value: p, label: p }))}
      />
      {employee && (
        <Field label={C.active}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
        </Field>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {employee ? C.save : C.addEmployee}
      </Button>
      {employee && (
        <ConfirmationDialog
          title={C.confirmRevoke}
          description={C.confirmDescription}
          trigger={<Button variant="danger">{C.revoke}</Button>}
          onConfirm={() => {
            void api
              .post(`/employees/${employee._id}/revoke`, {})
              .then(() => toast.success(C.saved))
              .catch(fail);
          }}
        />
      )}
    </form>
  );
}
