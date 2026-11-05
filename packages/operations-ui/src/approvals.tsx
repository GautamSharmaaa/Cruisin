"use client";
import { TaskPanel } from "./tasks";
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
export interface ApprovalPanelProps {
  request: Approval;
  api: OperationsTransport;
  onSaved: () => void;
  principal: Principal;
  timezone?: string;
}
export function ApprovalPanel({
  request,
  api,
  onSaved,
  principal,
  timezone = "Asia/Kolkata",
}: ApprovalPanelProps): ReactNode {
  const [task, setTask] = useState<Task | null>(null);
  useEffect(() => {
    if (request.kind === "task")
      void api.get<Task>(`/tasks/${request.entity}`).then(setTask).catch(fail);
  }, [api, request.entity, request.kind]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const review = async (status: string): Promise<void> => {
    if (notes.trim().length < 2) {
      fail(new Error(C.formInvalid));
      return;
    }
    setBusy(true);
    try {
      await api.post(`/approvals/${request._id}/review`, {
        version: request.version,
        status,
        notes,
      });
      toast.success(C.reviewed);
      onSaved();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const permission =
    request.kind === "inventory" ||
    request.kind === "qc_override" ||
    request.kind === "unit_disposition"
      ? "inventory.adjust.approve"
      : request.kind === "sop_change" || request.kind === "sop_publication"
        ? "sop.publish"
        : request.kind === "order_exception"
          ? "orders.update"
          : "tasks.approve";
  return (
    <div className="ui-stack">
      <p>{request.reason}</p>
      {request.existing && (
        <strong>
          {String(request.existing.sku ?? request.existing.title ?? "")}
        </strong>
      )}
      {task && (
        <TaskPanel
          initial={task}
          api={api}
          principal={principal}
          timezone={timezone}
          onSaved={onSaved}
        />
      )}
      <AttachmentList ids={request.evidence ?? []} api={api} />
      <Status>{request.status}</Status>
      <dl>
        {Object.entries(request.proposed)
          .filter(
            ([key]) =>
              ![
                "product",
                "variant",
                "returnReference",
                "expectedRevision",
                "attachments",
              ].includes(key),
          )
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
      </dl>
      <p>{request.notes}</p>
      {request.status === "PENDING" && (
        <>
          <Field label={C.reason}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </Field>
          <div className="ui-row">
            {principal.id !== request.requester &&
              principal.permissions.includes(permission) && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => void review("APPROVED")}
                  >
                    {C.approve}
                  </Button>
                  <Button
                    disabled={busy}
                    variant="danger"
                    onClick={() => void review("REJECTED")}
                  >
                    {C.reject}
                  </Button>
                  <Button
                    disabled={busy}
                    variant="secondary"
                    onClick={() => void review("REWORK_REQUIRED")}
                  >
                    {C.requestRework}
                  </Button>
                </>
              )}
            {principal.id === request.requester && (
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void review("CANCELLED")}
              >
                {C.cancel}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
