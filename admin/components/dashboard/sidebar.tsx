// Governed by .rules v1.0
'use client';
import { BarChart3, Bell, Boxes, ChevronRight, ExternalLink, FilePenLine, Files, FileText, LayoutDashboard, Package, Percent, RefreshCcw, Repeat2, Rows3, ShoppingBag, Truck, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { OPS_COPY } from '@cruisin/operations-ui';
import { COPY } from '@/constants/copy';
import { WORKSPACE_COPY as W } from '@/constants/workspace-copy';
import { useAdminMe } from '@/hooks/useAdminResources';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  employee: boolean;
}

export const employeeLinks = [
  { label: OPS_COPY.operationalSummary, href: '/operations', icon: LayoutDashboard },
  {label: OPS_COPY.employees, href:'/employees', icon:Users},
  {label: OPS_COPY.adminTasks, href:'/tasks', icon:Rows3},
  {label: OPS_COPY.approvals, href:'/approvals', icon:FileText},
  {label: OPS_COPY.inventory, href:'/inventory', icon:Boxes},
  {label: OPS_COPY.units, href:'/units', icon:Boxes},
  {label: OPS_COPY.fulfillment, href:'/fulfillment', icon:Boxes},
  {label: OPS_COPY.exceptions, href:'/exceptions', icon:Boxes},
  {label: OPS_COPY.sops, href:'/sops', icon:Files},
  {label: OPS_COPY.adminActivity, href:'/activity', icon:Rows3},
  {label: OPS_COPY.media, href:'/media', icon:Files},
  {label: OPS_COPY.settings, href:'/settings', icon:LayoutDashboard},
] as const;

export const adminLinks = [
  { label: COPY.nav.overview, href: '/', icon: LayoutDashboard },
  { label: COPY.nav.products, href: '/products', icon: Package },
  { label: COPY.nav.catalogues, href: '/catalogues', icon: Files },
  { label: COPY.nav.categories, href: '/categories', icon: Boxes },
  { label: COPY.nav.storefront, href: '/storefront', icon: Rows3 },
  { label: COPY.nav.delivery, href: '/delivery', icon: Truck },
  { label: COPY.nav.orders, href: '/orders', icon: ShoppingBag },
  { label: COPY.nav.invoices, href: '/invoices', icon: FileText },
  { label: 'Logistics', href: '/logistics', icon: Truck },
  { label: 'Logistics analytics', href: '/logistics/analytics', icon: BarChart3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'NDR & RTO recovery', href: '/logistics/ndr', icon: RefreshCcw },
  { label: 'Returns', href: '/returns', icon: Repeat2 },
  { label: 'Exchanges', href: '/exchanges', icon: Repeat2 },
  { label: COPY.nav.users, href: '/users', icon: Users },
  { label: COPY.nav.discounts, href: '/discounts', icon: Percent },
  { label: COPY.nav.cms, href: '/cms', icon: FilePenLine },
  { label: COPY.nav.analytics, href: '/analytics', icon: BarChart3 }
] as const;

export const isEmployeePath = (path: string): boolean =>
  employeeLinks.some(link => path === link.href || path.startsWith(link.href + '/'));

const operatorDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
const employeePortalUrl = process.env.NEXT_PUBLIC_EMPLOYEE_URL;

export function Sidebar({ isOpen, onClose, employee }: SidebarProps): ReactNode {
  const route = usePathname();
  const pathname = route === '/logistics/rto' ? '/logistics/ndr' : route;
  const me = useAdminMe();
  const links = employee ? employeeLinks : adminLinks.filter(link => link.href !== '/notifications' || ['admin', 'superadmin'].includes(me.data?.role ?? ''));
  const active = links.filter(link => pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + '/')))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
  const firstName = me.data?.name?.trim().split(/\s+/)[0] || W.operator;

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [isOpen, onClose]);

  const panel = () => (
    <aside className="cruisin-workspace-sidebar">
      <div className="cruisin-welcome">
        <div className="flex items-center justify-between">
          <span className="cruisin-welcome-avatar" aria-hidden="true">{firstName.slice(0, 1).toUpperCase()}</span>
          <button type="button" aria-label={COPY.nav.close} onClick={onClose} className="cruisin-toolbar-button workspace-mobile-control"><X size={18} /></button>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-widest text-text-secondary">{operatorDate.format(new Date())}</p>
        <p className="mt-2 text-xl font-semibold leading-tight">{W.welcome},<br />{firstName}</p>
      </div>
      <nav aria-label={W.navigation} className="cruisin-workspace-nav">
        {links.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} onClick={onClose} aria-current={active === href ? 'page' : undefined} className="cruisin-workspace-nav-link">
            <Icon size={16} aria-hidden="true" /><span>{label}</span>
            {active === href && <ChevronRight className="ml-auto" size={13} aria-hidden="true" />}
          </Link>
        ))}
      </nav>
      {employee && employeePortalUrl && (
        <a href={employeePortalUrl} target="_blank" rel="noopener noreferrer" onClick={onClose} className="cruisin-workspace-portal cruisin-workspace-nav-link">
          <ExternalLink size={16} aria-hidden="true" />{W.openPortal}
        </a>
      )}
    </aside>
  );

  return <>
    {isOpen && <div className="fixed inset-0 z-50 bg-background-primary/70 backdrop-blur lg:hidden"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {panel()}
    </div>}
    <div className="hidden min-w-0 lg:block">{panel()}</div>
  </>;
}
