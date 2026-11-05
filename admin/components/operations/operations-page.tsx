"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  OperationsPage as Workspace,
  type OperationsModule,
  type OperationsTransport,
  OPS_COPY as C,
} from "@cruisin/operations-ui";
import { Skeleton, Alert } from "@cruisin/ui";
import type { Principal } from "@cruisin/contracts";
import { api } from "@/lib/api";
const prefix = "/admin/operations";
const transport: OperationsTransport = {
  async get<T>(path: string): Promise<T> {
    return (await api.get<{ data: T }>(prefix + path)).data.data;
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    return (await api.post<{ data: T }>(prefix + path, body)).data.data;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await api.patch<{ data: T }>(prefix + path, body)).data.data;
  },
  async delete<T>(path: string): Promise<T> {
    return (await api.delete<{ data: T }>(prefix + path)).data.data;
  },
  publicUrl(path: string): string {
    return String(api.defaults.baseURL).replace(/\/$/, "") + path;
  },
};
export interface AdminOperationsProps {
  module: OperationsModule;
}
export function AdminOperations({ module }: AdminOperationsProps): ReactNode {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const zone = localStorage.getItem("cruisin-timezone");
    if (zone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        setTimezone(zone);
      } catch {}
    }
    void transport
      .get<Principal>("/permissions")
      .then(setPrincipal)
      .catch((e) => setError(e instanceof Error ? e.message : C.error));
  }, []);
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!principal) return <Skeleton />;
  return (
    <Workspace
      module={module}
      transport={transport}
      principal={principal}
      timezone={timezone}
    />
  );
}
