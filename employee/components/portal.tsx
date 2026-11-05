"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAxiosError } from "axios";
import { Button, ThemeSelect, Skeleton, Alert } from "@cruisin/ui";
import {
  OPS_COPY as C,
  OperationsPage,
  type OperationsModule,
} from "@cruisin/operations-ui";
import type { Employee, Principal, Permission } from "@cruisin/contracts";
import { employeeTransport as api, setEmployeeCsrf } from "../lib/api";
interface Session {
  employee: Employee;
  principal: Principal;
}
const SessionContext = createContext<Session | null>(null);
const navigation: { module: OperationsModule; permission?: Permission }[] = [
  { module: "dashboard" },
  { module: "tasks", permission: "tasks.view" },
  { module: "orders", permission: "orders.view" },
  { module: "inventory", permission: "inventory.view" },
  { module: "units", permission: "inventory.view" },
  { module: "scanner", permission: "inventory.view" },
  { module: "sops", permission: "sop.view" },
  { module: "approvals" },
  { module: "exceptions", permission: "tasks.view" },
  { module: "activity" },
  { module: "media" },
  { module: "profile" },
];
export interface PortalProps {
  children: ReactNode;
}
export function Portal({ children }: PortalProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const bootstrap = (): void => {
    setError("");
    void api
      .get<Session & { csrf: string }>("/session")
      .then((r) => {
        setEmployeeCsrf(r.csrf);
        setSession(r);
      })
      .catch((e) => {
        if (isAxiosError(e) && e.response?.status === 401)
          router.replace("/login");
        else setError(e instanceof Error ? e.message : C.error);
      });
  };
  useEffect(bootstrap, []);
  const logout = async (): Promise<void> => {
    await api.post("/logout", {});
    setEmployeeCsrf("");
    router.replace("/login");
  };
  if (error)
    return (
      <main className="ops-login">
        <Alert tone="danger">{error}</Alert>
        <Button onClick={bootstrap}>{C.refresh}</Button>
      </main>
    );
  if (!session)
    return (
      <main className="ops-login">
        <Skeleton />
      </main>
    );
  return (
    <SessionContext.Provider value={session}>
      <div className="ops-layout">
        <aside className="ops-sidebar">
          <p className="ops-eyebrow">{C.eyebrow}</p>
          <strong>{C.brand}</strong>
          <p className="ops-muted">{session.employee.name}</p>
          <nav aria-label={C.eyebrow}>
            {navigation
              .filter(
                (n) =>
                  !n.permission ||
                  session.principal.permissions.includes(n.permission),
              )
              .map((n) => {
                const href = n.module === "dashboard" ? "/" : `/${n.module}`;
                return (
                  <Link
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    key={n.module}
                  >
                    {C[n.module]}
                  </Link>
                );
              })}
          </nav>
          <ThemeSelect />
          <Button variant="ghost" onClick={() => void logout()}>
            {C.logout}
          </Button>
        </aside>
        <main className="ops-content">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}
export interface EmployeePageProps {
  module: OperationsModule;
}
export function EmployeePage({ module }: EmployeePageProps): ReactNode {
  const session = useContext(SessionContext);
  const router = useRouter();
  if (!session) return <Skeleton />;
  return (
    <OperationsPage
      module={module}
      principal={session.principal}
      timezone={session.employee.timezone}
      transport={api}
      onLogout={async () => {
        router.replace("/login");
      }}
    />
  );
}
