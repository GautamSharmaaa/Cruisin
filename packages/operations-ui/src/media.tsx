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
export interface MediaUploadProps {
  api: OperationsTransport;
  principal: Principal;
  onSaved: () => void;
}
export function MediaUpload({
  api,
  principal,
  onSaved,
}: MediaUploadProps): ReactNode {
  const [visibility, setVisibility] = useState("private");
  return (
    <Card title={C.upload}>
      {principal.permissions.includes("media.manage") && (
        <NativeSelect
          label={C.visibility}
          value={visibility}
          onChange={(v) => setVisibility(v[0] ?? "private")}
          options={[
            { value: "private", label: C.private },
            { value: "public", label: C.public },
          ]}
        />
      )}
      <FileUpload
        accept="image/png,image/jpeg,image/webp,application/pdf,video/mp4"
        onFile={(file) => {
          void upload(api, file, visibility)
            .then(() => {
              toast.success(C.saved);
              onSaved();
            })
            .catch(fail);
        }}
      />
    </Card>
  );
}
