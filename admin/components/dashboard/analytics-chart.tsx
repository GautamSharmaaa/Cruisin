// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export interface AnalyticsChartProps { }
const data = [{ day: 'Mon', value: 42000 }, { day: 'Tue', value: 53000 }, { day: 'Wed', value: 49000 }, { day: 'Thu', value: 88000 }, { day: 'Fri', value: 94000 }, { day: 'Sat', value: 120000 }];
export function AnalyticsChart(_props: AnalyticsChartProps): ReactNode { return <div className="h-80 border border-border bg-background-elevated p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid stroke="var(--border-subtle)" /><XAxis dataKey="day" stroke="var(--text-muted)" /><YAxis stroke="var(--text-muted)" /><Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /><Area type="monotone" dataKey="value" stroke="var(--accent-gold)" fill="var(--accent-gold-dim)" /></AreaChart></ResponsiveContainer></div>; }
