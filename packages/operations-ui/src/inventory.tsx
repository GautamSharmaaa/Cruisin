"use client";
import { INVENTORY_COPY as I } from "./constants/inventory-copy";
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
export interface AdjustmentFormProps {
  row: InventoryRow;
  api: OperationsTransport;
  onSaved: () => void;
}
export function AdjustmentForm({
  row,
  api,
  onSaved,
}: AdjustmentFormProps): ReactNode {
  const [returnRef, setReturnRef] = useState("");
  const [returns, setReturns] = useState<
    { _id: string; requestNumber: string }[]
  >([]);
  useEffect(() => {
    void api
      .get<typeof returns>(`/inventory/${row.variant}/returns`)
      .then(setReturns)
      .catch(fail);
  }, [api, row.variant]);
  const [count, setCount] = useState(row.available);
  const [damaged, setDamaged] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="ui-stack"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void api
          .post("/inventory/adjustments", {
            product: row.product,
            variant: row.variant,
            expectedStock: row.available,
            expectedRevision: row.revision,
            newStock: count,
            damagedDelta: damaged,
            reason,
            ...(returnRef ? { returnReference: returnRef } : {}),
          })
          .then(() => {
            toast.success(C.adjusted);
            onSaved();
          })
          .catch(fail)
          .finally(() => setBusy(false));
      }}
    >
      <Alert>{C.requiresApproval}</Alert>
      <p>
        {row.sku} · {row.size} · {row.color}
      </p>
      <NativeSelect
        label={C.returnReference}
        value={returnRef}
        onChange={(ids) => setReturnRef(ids[0] ?? "")}
        options={returns.map((r) => ({ value: r._id, label: r.requestNumber }))}
      />
      <Field label={C.count}>
        <Input
          type="number"
          min={0}
          max={1000000}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          required
        />
      </Field>
      <Field label={C.damageCount}>
        <Input
          type="number"
          min={0}
          value={damaged}
          onChange={(e) => setDamaged(Number(e.target.value))}
        />
      </Field>
      <Field label={C.reason}>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={5}
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {C.adjust}
      </Button>
    </form>
  );
}
export interface InventoryActionsProps {
  row: InventoryRow;
  api: OperationsTransport;
  principal: Principal;
  onSaved: () => void;
}
export function InventoryActions({
  row,
  api,
  principal,
  onSaved,
}: InventoryActionsProps): ReactNode {
  const [label, setLabel] = useState<{ svg: string; code: string } | null>(
    null,
  );
  const [history, setHistory] = useState<unknown>(null);
  const [labelPending, setLabelPending] = useState(false);
  const [labelError, setLabelError] = useState("");
  return (
    <div className="ui-row">
      {principal.permissions.includes("inventory.adjust.request") && (
        <Dialog
          title={C.adjust}
          trigger={<Button variant="secondary">{C.adjust}</Button>}
        >
          <AdjustmentForm row={row} api={api} onSaved={onSaved} />
        </Dialog>
      )}
      {principal.permissions.includes("inventory.count") && (
        <Dialog
          title={I.qrLabel}
          trigger={
            <Button
              variant="secondary"
              onClick={() => {
                setLabel(null);
                setLabelError("");
                setLabelPending(true);
                void api
                  .post<{
                    svg: string;
                    code: string;
                  }>("/inventory/labels", {
                    product: row.product,
                    variant: row.variant,
                  })
                  .then(setLabel)
                  .catch((error: unknown) => setLabelError(error instanceof Error ? error.message : C.error))
                  .finally(() => setLabelPending(false));
              }}
            >
              {C.label}
            </Button>
          }
        >
          {labelPending && <Skeleton />}
          {labelError && <Alert tone="danger">{labelError}</Alert>}
          {label && (
            <div className="ops-print-label ops-inventory-qr">
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(label.svg)}`}
                alt={row.sku}
                width={180}
                height={180}
              />
              <strong>{row.sku}</strong>
              <p>
                {row.size} / {row.color}
              </p>
              <Button onClick={() => window.print()}>{C.print}</Button>
            </div>
          )}
        </Dialog>
      )}
      <Dialog
        title={C.history}
        trigger={
          <Button
            variant="ghost"
            onClick={() => {
              void api
                .get(`/inventory/${row.variant}/history`)
                .then(setHistory)
                .catch(fail);
            }}
          >
            {C.history}
          </Button>
        }
      >
        <pre className="ops-pre">{JSON.stringify(history, null, 2)}</pre>
      </Dialog>
    </div>
  );
}
