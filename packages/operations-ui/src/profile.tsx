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
export interface ProfileProps {
  api: OperationsTransport;
  timezone: string;
  onLogout?: () => Promise<void>;
}
export function Profile({ api, timezone, onLogout }: ProfileProps): ReactNode {
  const [zone, setZone] = useState(timezone);
  const [sessions, setSessions] = useState<
    { _id: string; device: string; expiresAt: string }[]
  >([]);
  const load = useCallback(() => {
    void api.get<typeof sessions>("/sessions").then(setSessions).catch(fail);
  }, [api]);
  useEffect(load, [load]);
  return (
    <div className="ui-stack">
      <Card title={C.profile}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void api
              .patch("/profile", { timezone: zone })
              .then(() => window.location.reload())
              .catch(fail);
          }}
        >
          <Field label={C.timezone}>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} />
          </Field>
          <Button type="submit">{C.save}</Button>
        </form>
      </Card>
      <Card title={C.sessions}>
        <Alert>{C.security}</Alert>
        {sessions.map((s) => (
          <div className="ui-row" key={s._id}>
            <p>{s.device}</p>
            <Button
              variant="secondary"
              onClick={() => {
                void api.delete(`/sessions/${s._id}`).then(load).catch(fail);
              }}
            >
              {C.revoke}
            </Button>
          </div>
        ))}
        <Button
          variant="danger"
          onClick={() => {
            void api
              .post("/logout-all", {})
              .then(() => onLogout?.())
              .catch(fail);
          }}
        >
          {C.logoutAll}
        </Button>
      </Card>
    </div>
  );
}
