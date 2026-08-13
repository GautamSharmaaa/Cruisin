// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COPY } from '@/constants/copy';
import type { AdminAnalyticsPointDto } from '@/types/dto.types';

export interface AnalyticsChartProps {
  data: AdminAnalyticsPointDto[];
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
}

interface AnalyticsTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

function AnalyticsTooltip({ active, label, payload }: AnalyticsTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  return <div className="border border-border bg-background-overlay p-3 text-xs text-text-primary"><p className="font-mono text-accent-gold">{label}</p>{payload.map((item) => <p key={item.name ?? COPY.common.none} className="mt-1 text-text-secondary">{item.name}: {item.value ?? 0}</p>)}</div>;
}

export function AnalyticsChart({ data }: AnalyticsChartProps): ReactNode {
  return <div className="h-80 border border-border bg-background-elevated p-4">{data.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-text-secondary">{COPY.analytics.noData}</div> : <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data}><CartesianGrid stroke="var(--border-subtle)" /><XAxis dataKey="day" stroke="var(--text-muted)" /><YAxis yAxisId="money" stroke="var(--text-muted)" /><YAxis yAxisId="count" orientation="right" stroke="var(--text-muted)" allowDecimals={false} /><Tooltip content={<AnalyticsTooltip />} /><Legend /><Area yAxisId="money" type="monotone" dataKey="revenue" name={COPY.analytics.revenue} stroke="var(--accent-gold)" fill="var(--accent-gold-dim)" /><Line yAxisId="money" type="monotone" dataKey="pendingCod" name="Pending COD" stroke="var(--text-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /><Line yAxisId="count" type="monotone" dataKey="codOrders" name="COD orders" stroke="var(--text-primary)" strokeWidth={2} strokeDasharray="6 5" dot={false} activeDot={{ r: 4 }} /></ComposedChart></ResponsiveContainer>}</div>;
}
