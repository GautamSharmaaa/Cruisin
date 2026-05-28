// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { drawerVariants } from '@/lib/animations';

export interface DrawerProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; }
export function Drawer({ open, onOpenChange, title, children }: DrawerProps): ReactNode { return <Dialog.Root open={open} onOpenChange={onOpenChange}><AnimatePresence>{open ? <Dialog.Portal forceMount><Dialog.Overlay className="fixed inset-0 z-50 bg-background-primary/70 backdrop-blur" /><Dialog.Content asChild><motion.aside variants={drawerVariants} initial="initial" animate="animate" exit="exit" className="fixed right-0 top-0 z-50 h-dvh w-full max-w-md border-l border-border bg-background-elevated p-6 shadow-lg"><Dialog.Title className="font-display text-xl text-text-primary">{title}</Dialog.Title><Dialog.Close className="absolute right-4 top-4 h-11 w-11 text-text-secondary" aria-label={COPY.common.close}>×</Dialog.Close><div className="mt-8 h-[calc(100dvh-96px)] overflow-y-auto">{children}</div></motion.aside></Dialog.Content></Dialog.Portal> : null}</AnimatePresence></Dialog.Root>; }
