// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COPY } from '@/constants/copy';
export interface AnalyticsChartProps { }
const data = COPY.analytics.days.map((day, index) => ({ day, value: [42000, 53000, 49000, 88000, 94000, 120000][index] ?? 0 }));
export function AnalyticsChart(_props: AnalyticsChartProps): ReactNode { return <div className="h-80 border border-border bg-background-elevated p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid stroke="var(--border-subtle)" /><XAxis dataKey="day" stroke="var(--text-muted)" /><YAxis stroke="var(--text-muted)" /><Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /><Area type="monotone" dataKey="value" stroke="var(--accent-gold)" fill="var(--accent-gold-dim)" /></AreaChart></ResponsiveContainer></div>; }
