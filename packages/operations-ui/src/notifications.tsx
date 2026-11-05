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
export interface NotificationListProps {
  api: OperationsTransport;
  timezone: string;
}
export function NotificationList({
  api,
  timezone,
}: NotificationListProps): ReactNode {
  const list = useList<{
    _id: string;
    message: string;
    event: string;
    createdAt: string;
    readAt?: string;
  }>(api, "/notifications");
  return (
    <Card title={C.notifications}>
      {list.error && <Alert tone="danger">{list.error}</Alert>}
      {list.data?.items.map((n) => (
        <div key={n._id} className="ui-row">
          <p>
            {n.message} · {n.event} · {displayTime(n.createdAt, timezone)}
          </p>
          {!n.readAt && (
            <Button
              variant="ghost"
              onClick={() => {
                void api
                  .post(`/notifications/${n._id}/read`, {})
                  .then(list.reload)
                  .catch(fail);
              }}
            >
              {C.markRead}
            </Button>
          )}
        </div>
      ))}
      {list.data?.items.length === 0 && <p>{C.notificationEmpty}</p>}
    </Card>
  );
}
