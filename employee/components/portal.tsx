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
import {
  LayoutDashboard, ListChecks, ShoppingBag, Boxes, Package, ScanLine,
  Files, FileCheck2, TriangleAlert, Activity, Image, User, ChevronRight,
  Menu, X, LogOut, RefreshCw, type LucideIcon,
} from "lucide-react";
import { EMPLOYEE_COPY as E } from "../constants/copy";
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
const navigationIcons: Partial<Record<OperationsModule, LucideIcon>> = {
  dashboard: LayoutDashboard, tasks: ListChecks, orders: ShoppingBag,
  inventory: Boxes, units: Package, scanner: ScanLine, sops: Files,
  approvals: FileCheck2, exceptions: TriangleAlert, activity: Activity,
  media: Image, profile: User,
};
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
  const [navigationOpen, setNavigationOpen] = useState(false);
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
      <div className="employee-shell">
        <aside className="employee-sidebar" data-open={navigationOpen}>
          <div className="employee-brand">
            <p className="ops-eyebrow">{E.eyebrow}</p>
            <Link href="/" className="employee-wordmark" onClick={() => setNavigationOpen(false)}>{C.brand}</Link>
            <p className="employee-tagline">{E.tagline}</p>
          </div>
          <nav id="employee-navigation" aria-label={C.eyebrow}>
            {navigation
              .filter((n) => !n.permission || session.principal.permissions.includes(n.permission))
              .map((n) => {
                const href = n.module === "dashboard" ? "/" : `/${n.module}`;
                const Icon = navigationIcons[n.module] ?? LayoutDashboard;
                const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
                return (
                  <Link href={href} aria-current={active ? "page" : undefined} key={n.module} onClick={() => setNavigationOpen(false)}>
                    <span><Icon size={17} aria-hidden="true" />{C[n.module]}</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                );
              })}
          </nav>
          <div className="employee-identity">
            <p className="ops-eyebrow">{E.workspace}</p>
            <p>{session.employee.name}</p>
            <span>{session.employee.role.replaceAll("_", " ")}</span>
          </div>
        </aside>
        <div className="employee-main">
          <header className="employee-topbar">
            <div className="employee-topbar-row">
              <button type="button" className="employee-menu" aria-label={navigationOpen ? E.closeNavigation : E.openNavigation} aria-expanded={navigationOpen} aria-controls="employee-navigation" onClick={() => setNavigationOpen(!navigationOpen)}>
                {navigationOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <p className="employee-breadcrumb"><span>{C.brand}</span><ChevronRight size={14} aria-hidden="true" />{C[navigation.find((n) => (n.module === "dashboard" ? pathname === "/" : pathname.startsWith(`/${n.module}`)))?.module ?? "dashboard"]}</p>
              <div className="employee-tools">
                <ThemeSelect />
                <Button variant="ghost" aria-label={C.refresh} onClick={() => window.location.reload()}><RefreshCw size={16} /></Button>
                <Button variant="secondary" onClick={() => void logout()}><LogOut size={16} /><span>{C.logout}</span></Button>
              </div>
            </div>
          </header>
          <main className="ops-content">{children}</main>
        </div>
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
