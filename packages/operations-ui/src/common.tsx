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
export const displayTime = (
  value: string | undefined,
  timezone: string,
): string =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value))
    : "—";
export const fail = (e: unknown): void => {
  toast.error(e instanceof Error ? e.message : C.error);
};
export function useList<T>(
  api: OperationsTransport,
  path: string,
  q = "",
  status = "",
  page = 1,
): { data: PageResult<T> | null; error: string; reload: () => void } {
  const [data, setData] = useState<PageResult<T> | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    const timer = setTimeout(() => {
      void api
        .get<PageResult<T>>(
          `${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=20&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,
        )
        .then((r) => {
          if (active) setData(r);
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : C.error);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, path, q, status, page, revision]);
  return { data, error, reload: () => setRevision((x) => x + 1) };
}
export interface NativeSelectProps {
  label: string;
  value: string | string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  multiple?: boolean;
}
export function NativeSelect({
  label,
  value,
  onChange,
  options,
  multiple = false,
}: NativeSelectProps): ReactNode {
  return (
    <Field label={label}>
      <select
        className="ui-input"
        aria-label={label}
        multiple={multiple}
        value={value}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions, (o) => o.value))
        }
      >
        {!multiple && <option value="">—</option>}
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export interface AttachmentListProps {
  ids: string[];
  api: OperationsTransport;
}
export interface MediaAttachmentProps {
  id: string;
  api: OperationsTransport;
}
export function MediaAttachment({ id, api }: MediaAttachmentProps): ReactNode {
  const [asset, setAsset] = useState<{
    name: string;
    contentType: string;
  } | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([
      api.get<{ name: string; contentType: string }>(`/media/${id}`),
      api.post<{ token: string }>(`/media/${id}/access`, {}),
    ])
      .then(([meta, grant]) => {
        if (active) {
          setAsset(meta);
          setUrl(
            api.publicUrl(
              `/media/${id}/signed?token=${encodeURIComponent(grant.token)}`,
            ),
          );
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : C.error);
      });
    return () => {
      active = false;
    };
  }, [id, api]);
  return (
    <div className="ui-stack">
      {error && <Alert tone="danger">{error}</Alert>}
      {asset && url && (
        <>
          {asset.contentType.startsWith("image/") ? (
            <img
              className="ops-media-preview"
              src={url}
              alt={asset.name}
              width={320}
              height={240}
            />
          ) : asset.contentType.startsWith("video/") ? (
            <video
              className="ops-media-preview"
              controls
              preload="metadata"
              src={url}
            />
          ) : null}
          <a
            className="ui-button ui-button-secondary"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {asset.name} · {C.openFile}
          </a>
        </>
      )}
    </div>
  );
}
export function AttachmentList({ ids, api }: AttachmentListProps): ReactNode {
  return (
    <div className="ui-grid">
      {ids.map((id) => (
        <MediaAttachment key={id} id={id} api={api} />
      ))}
    </div>
  );
}
export async function upload(
  api: OperationsTransport,
  file: File,
  visibility = "private",
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("visibility", visibility);
  const result = await api.post<{ _id: string }>("/media", form);
  return result._id;
}
