// Governed by .rules v1.0
'use client';

import { useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminDisclosure, AdminStat, AdminStatsGrid } from '@/components/dashboard/admin-ui';
import { useAdminStorefrontActivity } from '@/hooks/useAdminResources';
import { exportToCsv } from '@/lib/export-csv';

const values = [
  ['Website visits', 'visits'],
  ['Customers signed in', 'customersSignedIn'],
  ['Visits with bag adds', 'bagVisitors'],
  ['Mobile visits', 'mobileVisits'],
  ['Desktop web visits', 'desktopVisits']
] as const;

const dateFormat = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const formatBucket = (value: string) => value.includes(':') ? value : value.length === 7 ? monthFormat.format(new Date(value + '-01T00:00:00Z')) : dateFormat.format(new Date(value + 'T00:00:00Z'));

function ActivityTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number }> }): ReactNode {
  if (!active || !label || !payload?.length) return null;
  return <div className="border border-border bg-background-elevated p-3 text-xs text-text-primary shadow-lg">
    <p className="mb-1 font-semibold">{formatBucket(label)}</p>
    {payload.map(item => <p key={item.name} className="flex justify-between gap-6 text-text-secondary"><span>{item.name}</span><strong>{item.value ?? 0}</strong></p>)}
  </div>;
}

export function StorefrontActivity({ query }: { query: ReturnType<typeof useAdminStorefrontActivity> }): ReactNode {
  const { data, error, isLoading } = query;
  const animate = !useReducedMotion();
  return <section className="grid min-w-0 gap-4" aria-labelledby="storefront-activity-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="storefront-activity-heading" className="font-display text-xl">Storefront activity</h2>
        <p className="mt-1 text-xs text-text-secondary">India Standard Time. Visits count browser sessions. Sign-ins count unique customer accounts.</p>
      </div>
      {data ? <button type="button" className="min-h-11 border border-border px-4 text-sm hover:border-accent-gold" onClick={() => exportToCsv('storefront-activity.csv', [['Period (IST)', 'Mobile visits', 'Desktop web visits', 'Visits with bag adds'], ...data.series.map(point => [point.bucket, point.mobileVisits, point.desktopVisits, point.bagVisitors])])}>Export activity</button> : null}
    </div>
    {error ? <p role="alert" className="text-sm text-danger">Storefront activity couldn’t load. <button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button></p> : null}
    <AdminStatsGrid className="sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {values.map(([label, key]) => <AdminStat key={key} label={label} value={data?.[key].toLocaleString('en-IN') ?? '—'} />)}
    </AdminStatsGrid>
    {isLoading ? <p role="status" className="text-sm text-text-muted">Loading storefront activity…</p> : null}
    {data ? <div className="min-w-0 border border-border bg-background-elevated p-4 sm:p-5">
      <h3 className="text-base font-semibold">Visits and bag activity</h3>
      <p className="mt-1 text-xs text-text-secondary">{data.startDate} to {data.endDate} · {data.granularity === 'hour' ? 'Hourly' : data.granularity === 'month' ? 'Monthly' : 'Daily'}</p>
      {data.visits || data.bagVisitors ? <div className="mt-4 h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.series} accessibilityLayer margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-default)" strokeDasharray="3 4" />
            <XAxis dataKey="bucket" tickFormatter={formatBucket} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis allowDecimals={false} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} width={40} />
            <Tooltip content={<ActivityTooltip />} />
            <Legend />
            <Bar dataKey="mobileVisits" name="Mobile visits" stackId="visits" fill="var(--accent-gold)" maxBarSize={32} isAnimationActive={animate} animationDuration={460} animationEasing="ease-out" />
            <Bar dataKey="desktopVisits" name="Desktop web visits" stackId="visits" fill="var(--text-secondary)" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={animate} animationDuration={460} animationEasing="ease-out" />
            <Line dataKey="bagVisitors" name="Visits with bag adds" stroke="var(--color-success)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} isAnimationActive={animate} animationDuration={460} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div> : <p className="py-10 text-sm text-text-secondary">No visits or bag adds recorded for this period. Storefront activity is available from the day tracking was enabled.</p>}
      {data.series.length > 0 && (data.visits > 0 || data.bagVisitors > 0) ? <AdminDisclosure label="View activity data">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr><th scope="col">Period</th><th scope="col">Mobile</th><th scope="col">Desktop</th><th scope="col">Bag adds</th></tr></thead><tbody>
            {data.series.map(point => <tr key={point.bucket} className="border-t border-border"><th scope="row" className="py-2 font-medium">{formatBucket(point.bucket)}</th><td>{point.mobileVisits}</td><td>{point.desktopVisits}</td><td>{point.bagVisitors}</td></tr>)}
          </tbody></table>
        </div>
      </AdminDisclosure> : null}
    </div> : null}
  </section>;
}
