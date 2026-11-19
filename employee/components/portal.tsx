"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
const navigation: {
  group: keyof typeof E.navigationGroups;
  links: { module: OperationsModule; permission?: Permission }[];
}[] = [
  { group: "work", links: [
    { module: "dashboard" },
    { module: "tasks", permission: "tasks.view" },
    { module: "orders", permission: "orders.view" },
    { module: "approvals" },
    { module: "exceptions", permission: "tasks.view" },
  ] },
  { group: "stock", links: [
    { module: "inventory", permission: "inventory.view" },
    { module: "units", permission: "inventory.view" },
    { module: "scanner", permission: "inventory.view" },
  ] },
  { group: "resources", links: [
    { module: "sops", permission: "sop.view" },
    { module: "activity" },
    { module: "media" },
    { module: "profile" },
  ] },
];
export interface PortalProps {
  children: ReactNode;
}
export function Portal({ children }: PortalProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const navigationDialog = useRef<HTMLDialogElement>(null);
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
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (): void => { if (desktop.matches) navigationDialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const logout = async (): Promise<void> => {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await api.post("/logout", {});
      setEmployeeCsrf("");
      router.replace("/login");
    } catch (failure) {
      setLogoutError(failure instanceof Error ? failure.message : C.error);
      setLoggingOut(false);
    }
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
  const closeNavigation = (): void => navigationDialog.current?.close();
  const activeModule = navigation.flatMap(group => group.links).find(({ module }) =>
    module === "dashboard" ? pathname === "/" : pathname.split("/")[1] === module
  )?.module ?? "dashboard";
  const sidebar = (
    <>
      <div className="employee-brand">
        <p className="ops-eyebrow">{E.eyebrow}</p>
        <Link href="/" className="employee-wordmark" onClick={closeNavigation}>{C.brand}</Link>
        <p className="employee-tagline">{E.tagline}</p>
      </div>
      <nav className="employee-navigation" aria-label={C.eyebrow}>
        {navigation.map(({ group, links }) => {
          const available = links.filter(({ permission }) => !permission || session.principal.permissions.includes(permission));
          if (!available.length) return null;
          return (
            <div className="employee-nav-group" key={group}>
              <p className="employee-nav-label">{E.navigationGroups[group]}</p>
              {available.map(({ module }) => {
                const Icon = navigationIcons[module] ?? LayoutDashboard;
                return (
                  <Link href={module === "dashboard" ? "/" : `/${module}`} aria-current={activeModule === module ? "page" : undefined} key={module} onClick={closeNavigation}>
                    <span><Icon size={17} aria-hidden="true" />{C[module]}</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="employee-identity">
        <div className="employee-avatar" aria-hidden="true">{session.employee.name.trim().charAt(0).toUpperCase()}</div>
        <div>
          <p className="ops-eyebrow">{E.workspace}</p>
          <p className="employee-name">{session.employee.name}</p>
          <span>{session.employee.role.replaceAll("_", " ")}</span>
        </div>
      </div>
    </>
  );
  return (
    <SessionContext.Provider value={session}>
      <div className="employee-shell">
        <a className="employee-skip" href="#employee-content">{E.skip}</a>
        <aside className="employee-sidebar employee-sidebar-desktop">{sidebar}</aside>
        <dialog ref={navigationDialog} id="employee-navigation" className="employee-nav-dialog" aria-label={C.eyebrow} onClose={() => setNavigationOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeNavigation(); }}>
          <div className="employee-sidebar">
            <button type="button" className="employee-menu employee-nav-close" aria-label={E.closeNavigation} onClick={closeNavigation}><X size={18} /></button>
            {sidebar}
          </div>
        </dialog>
        <div className="employee-main">
          <header className="employee-topbar">
            <div className="employee-topbar-row">
              <button type="button" className="employee-menu" aria-label={E.openNavigation} aria-expanded={navigationOpen} aria-controls="employee-navigation" onClick={() => {
                navigationDialog.current?.showModal();
                setNavigationOpen(true);
              }}><Menu size={18} /></button>
              <p className="employee-breadcrumb"><span>{E.workspace}</span><ChevronRight size={14} aria-hidden="true" />{C[activeModule]}</p>
              <div className="employee-tools">
                <ThemeSelect />
                <Button variant="ghost" aria-label={C.refresh} onClick={() => window.location.reload()}><RefreshCw size={16} /></Button>
                <Button variant="secondary" aria-label={C.logout} disabled={loggingOut} onClick={() => void logout()}><LogOut size={16} /><span>{C.logout}</span></Button>
              </div>
            </div>
          </header>
          <main id="employee-content" className="ops-content" tabIndex={-1}>
            {logoutError && <Alert tone="danger">{logoutError}</Alert>}
            {children}
          </main>
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
      description={module in E.descriptions ? E.descriptions[module as keyof typeof E.descriptions] : undefined}
      principal={session.principal}
      timezone={session.employee.timezone}
      transport={api}
      onLogout={async () => {
        router.replace("/login");
      }}
    />
  );
}
