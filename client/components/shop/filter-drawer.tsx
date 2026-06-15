// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Drawer } from '@/components/shared/drawer';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { COPY } from '@/constants/copy';

export interface FilterDrawerProps { open: boolean; onOpenChange: (open: boolean) => void; activeCount: number; }
export function FilterDrawer({ open, onOpenChange, activeCount }: FilterDrawerProps): ReactNode { return <Drawer open={open} onOpenChange={onOpenChange} title={COPY.shop.filters}><div className="block lg:hidden"><FilterSidebar activeCount={activeCount} className="w-full p-6 block" /></div></Drawer>; }
