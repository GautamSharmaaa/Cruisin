// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminCard({ children, className, compact = false }: { children: ReactNode; className?: string; compact?: boolean }): ReactNode {
  return <section className={cn('min-w-0 border border-border bg-background-elevated shadow-lg', compact ? 'p-4' : 'p-5 sm:p-6', className)}>{children}</section>;
}

export function AdminSectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }): ReactNode {
  return <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      {eyebrow ? <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">{eyebrow}</p> : null}
      <h2 className="mt-2 break-words font-display text-2xl text-text-primary">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>;
}

export function AdminStatsGrid({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={cn('grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>;
}

export function AdminStat({ label, value, helper, tone = 'neutral' }: { label: string; value: string | number; helper?: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'gold' }): ReactNode {
  return <AdminCard compact className="overflow-hidden">
    <p className="truncate text-[11px] uppercase tracking-[0.14em] text-text-muted">{label}</p>
    <p className={cn('mt-2 truncate font-mono text-2xl text-text-primary', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning', tone === 'danger' && 'text-danger', tone === 'gold' && 'text-accent-gold')}>{value}</p>
    {helper ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">{helper}</p> : null}
  </AdminCard>;
}

export function AdminDataTable({ children, minWidth = 900, className }: { children: ReactNode; minWidth?: number; className?: string }): ReactNode {
  return <div className={cn('min-w-0 overflow-x-auto border border-border bg-background-elevated shadow-lg', className)}>
    <table className="w-full text-left text-sm" style={{ minWidth }}>{children}</table>
  </div>;
}

export function AdminFilters({ children, action }: { children: ReactNode; action?: ReactNode }): ReactNode {
  return <AdminCard compact className="grid gap-4">
    <div className="flex min-w-0 flex-wrap items-end gap-3">{children}</div>
    {action ? <div className="flex flex-wrap gap-2 border-t border-border pt-4">{action}</div> : null}
  </AdminCard>;
}

export function AdminFormSection({ title, description, children, columns = 2 }: { title: string; description?: string; children: ReactNode; columns?: 1 | 2 | 3 }): ReactNode {
  return <AdminCard className="grid gap-5">
    <AdminSectionHeader title={title} description={description} />
    <div className={cn('grid min-w-0 gap-4', columns === 1 && 'grid-cols-1', columns === 2 && 'md:grid-cols-2', columns === 3 && 'md:grid-cols-2 xl:grid-cols-3')}>{children}</div>
  </AdminCard>;
}

export function AdminActionBar({ children }: { children: ReactNode }): ReactNode {
  return <div className="sticky bottom-4 z-30 border border-accent-gold bg-background-primary/95 p-4 shadow-lg backdrop-blur">
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>
  </div>;
}

export function AdminTabs<TValue extends string>({ tabs, value, onChange }: { tabs: Array<{ value: TValue; label: string; helper?: string }>; value: TValue; onChange: (value: TValue) => void }): ReactNode {
  return <div className="min-w-0 overflow-x-auto border-b border-border">
    <div className="flex min-w-max gap-2">
      {tabs.map((tab) => <button key={tab.value} type="button" onClick={() => onChange(tab.value)} className={cn('min-h-11 border-b px-4 text-left text-sm transition', value === tab.value ? 'border-accent-gold text-accent-gold' : 'border-transparent text-text-secondary hover:text-text-primary')}>
        <span className="block font-medium">{tab.label}</span>
        {tab.helper ? <span className="block text-[11px] text-text-muted">{tab.helper}</span> : null}
      </button>)}
    </div>
  </div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }): ReactNode {
  return <div className="grid min-h-56 place-items-center border border-border bg-background-elevated p-8 text-center">
    <div className="max-w-md">
      <Inbox className="mx-auto text-accent-gold" size={28} />
      <h3 className="mt-4 font-display text-2xl text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  </div>;
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }): ReactNode {
  return <div className="grid gap-3">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-24 animate-pulse border border-border bg-background-elevated" />)}</div>;
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }): ReactNode {
  return <div className="flex min-w-0 items-start gap-3 border border-danger/70 bg-background-elevated p-4 text-sm text-danger">
    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  </div>;
}

export function LoadingInline({ label = 'Loading' }: { label?: string }): ReactNode {
  return <span className="inline-flex items-center gap-2 text-sm text-text-secondary"><Loader2 size={14} className="animate-spin" />{label}</span>;
}
