// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
export interface TopbarProps { }
export function Topbar(_props: TopbarProps): ReactNode { return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background-primary/85 px-6 backdrop-blur"><Input label={COPY.common.search} className="max-w-sm" /><Button variant="secondary">{COPY.common.export}</Button></header>; }
