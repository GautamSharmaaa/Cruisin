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
export interface PackingProps {
  api: OperationsTransport;
}
export function Packing({ api }: PackingProps): ReactNode {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [order, setOrder] = useState("");
  const [task, setTask] = useState("");
  const [data, setData] = useState<{
    order: {
      items: {
        sku: string;
        title: string;
        size: string;
        color: string;
        quantity: number;
      }[];
    };
    packing: {
      version: number;
      items: { sku: string; quantity: number }[];
      completedAt?: string;
    } | null;
  } | null>(null);
  useEffect(() => {
    void api
      .get<PageResult<Task>>("/tasks?limit=100")
      .then((r) => setTasks(r.items.filter((t) => t.order)))
      .catch(fail);
  }, [api]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrder(params.get("order") ?? "");
    setTask(params.get("task") ?? "");
  }, []);
  const load = async (): Promise<void> => {
    const result = await api.get<NonNullable<typeof data>>(`/orders/${order}`);
    setData(result);
  };
  return (
    <div className="ui-stack">
      <Card title={C.orders}>
        <p>{C.noOrders}</p>
        <NativeSelect
          label={C.packingTask}
          value={task}
          onChange={(ids) => {
            const match = tasks.find((t) => t._id === ids[0]);
            setTask(match?._id ?? "");
            setOrder(match?.order ?? "");
          }}
          options={tasks.map((t) => ({ value: t._id, label: t.title }))}
        />
        <Button onClick={() => void load().catch(fail)}>{C.loadOrder}</Button>
      </Card>
      {data && (
        <>
          <DataTable
            caption={C.orders}
            items={data.order.items}
            keyOf={(i) => i.sku}
            columns={[
              { key: "sku", label: C.sku, render: (i) => i.sku },
              { key: "title", label: C.title, render: (i) => i.title },
              {
                key: "size",
                label: C.size,
                render: (i) => `${i.size} / ${i.color}`,
              },
              {
                key: "quantity",
                label: C.packed,
                render: (i) =>
                  `${data.packing?.items.find((p) => p.sku === i.sku)?.quantity ?? 0} / ${i.quantity}`,
              },
            ]}
          />
          {!data.packing?.completedAt && (
            <>
              <Scanner
                onScan={async (code) => {
                  await api.post(`/orders/${order}/scan`, {
                    task,
                    code,
                    version: data.packing?.version ?? 0,
                  });
                  await load();
                }}
              />
              <Button
                onClick={() => {
                  void api
                    .post(`/orders/${order}/complete-packing`, {
                      task,
                      version: data.packing?.version ?? 0,
                    })
                    .then(load)
                    .catch(fail);
                }}
              >
                {C.finishPacking}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
