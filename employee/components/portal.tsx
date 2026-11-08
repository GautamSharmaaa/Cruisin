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
import { EMPLOYEE_WORKSPACE_COPY as W, EMPLOYEE_COPY as E } from "../constants/copy";
import { isAxiosError } from "axios";
import {WorkspaceDashboard,type WorkspaceMetric} from "@cruisin/ui";
import { Button, ThemeSelect, Skeleton, Alert } from "@cruisin/ui";
import {
  OPS_COPY as C,
  NotificationList,
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
  if(pathname==='/')return <SessionContext.Provider value={session}><main className="workspace-page-shell">{children}</main></SessionContext.Provider>;
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
                <Button variant="secondary" aria-label={C.logout} onClick={() => void logout()}><LogOut size={16} /><span>{C.logout}</span></Button>
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
  if(module==='dashboard')return <EmployeeWorkspace session={session}/>;
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

interface EmployeeSummary {fulfillment:{awaitingPacking:number;packed:number;readyForHandover:number}|null;tasks:{active:number;overdue:number};pendingApprovals:number;lowStockVariants:number;unitStates:{_id:string;count:number}[];openExceptions:number;unreadNotifications:number;}
interface WorkspaceTask {_id:string;title:string;status:string;priority:string;dueAt?:string;}
interface EmployeeWorkspaceProps {session:Session;}
function EmployeeWorkspace({session}:EmployeeWorkspaceProps):ReactNode{
 const [summary,setSummary]=useState<EmployeeSummary|null>(null);const [tasks,setTasks]=useState<WorkspaceTask[]>([]);const [error,setError]=useState(false);const [errorMessage,setErrorMessage]=useState('');const [loading,setLoading]=useState(true);const [revision,setRevision]=useState(0);const router=useRouter();const canTasks=session.principal.permissions.includes('tasks.view');const canInventory=session.principal.permissions.includes('inventory.view');
 useEffect(()=>{let active=true;setLoading(true);setError(false);setErrorMessage('');Promise.all([api.get<EmployeeSummary>('/summary'),canTasks?api.get<{items:WorkspaceTask[]}>('/tasks?limit=12'):Promise.resolve({items:[]})]).then(([next,list])=>{if(active){setSummary(next);setTasks(list.items);}}).catch((failure:unknown)=>{if(active){setError(true);setErrorMessage(failure instanceof Error?failure.message:C.error);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[canTasks,revision]);
 const metrics:WorkspaceMetric[]=[...(canTasks?[{id:'tasks',label:W.tasks,value:String(summary?.tasks.active??0),detail:W.tasksDetail,tone:'blue' as const,href:'/tasks'}]:[]),{id:'approvals',label:W.approvals,value:String(summary?.pendingApprovals??0),detail:W.approvalsDetail,tone:'amber',href:'/approvals'},{id:'notifications',label:W.notifications,value:String(summary?.unreadNotifications??0),detail:W.notificationsDetail,tone:'rose',href:'/profile'},...(canInventory?[{id:'stock',label:W.stock,value:String(summary?.lowStockVariants??0),detail:W.stockDetail,tone:'mint' as const,href:'/inventory'}]:[])];
 const modules=navigation.filter(item=>!item.permission||session.principal.permissions.includes(item.permission)).map(item=>({label:C[item.module],href:item.module==='dashboard'?'/':'/'+item.module}));
 const series=canInventory?(summary?.unitStates??[]).map(item=>({label:item._id.replaceAll('_',' '),value:item.count})):Array.from(new Set(tasks.map(task=>task.status))).map(status=>({label:status.replaceAll('_',' '),value:tasks.filter(task=>task.status===status).length}));
 return <WorkspaceDashboard role="employee" title={W.title} subtitle={W.subtitle} name={session.employee.name} metrics={metrics} series={series} seriesTitle={canInventory?W.inventorySeries:W.taskSeries} activity={tasks.filter(task=>!['COMPLETED','CANCELLED'].includes(task.status)).slice(0,5).map(task=>({id:task._id,title:task.title,detail:task.dueAt?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:session.employee.timezone}).format(new Date(task.dueAt)):task.priority+' '+W.priority,status:task.status,href:'/tasks?q='+encodeURIComponent(task.title),tone:task.priority==='urgent'||task.priority==='high'?'rose':'blue'}))} modules={modules} shortcuts={modules.filter(item=>['/tasks','/inventory','/approvals','/sops'].includes(item.href)).map((item,index)=>({...item,tone:['blue','amber','mint','rose'][index]}))} urls={{admin:process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193',employee:process.env.NEXT_PUBLIC_EMPLOYEE_URL??'http://127.0.0.1:3194',storefront:process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192'}} signals={[{label:C.overdueTasks,value:summary?.tasks.overdue??0},{label:C.openExceptions,value:summary?.openExceptions??0},...(summary?.fulfillment?[{label:C.awaitingPacking,value:summary.fulfillment.awaitingPacking},{label:C.packedOrders,value:summary.fulfillment.packed},{label:C.readyForHandover,value:summary.fulfillment.readyForHandover}]:[])]} errorMessage={errorMessage} loading={loading} error={error} timezone={session.employee.timezone} onRefresh={()=>setRevision(value=>value+1)} onLogout={()=>{void api.post('/logout',{}).then(()=>{setEmployeeCsrf('');router.replace('/login');}).catch(()=>setError(true));}}><NotificationList key={revision} api={api} timezone={session.employee.timezone} onRead={()=>{void api.get<EmployeeSummary>('/summary').then(setSummary).catch(()=>setError(true));}}/></WorkspaceDashboard>;
}
