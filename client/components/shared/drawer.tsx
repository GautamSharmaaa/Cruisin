// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { drawerVariants } from '@/lib/animations';

export interface DrawerProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; }
export function Drawer({ open, onOpenChange, title, children }: DrawerProps): ReactNode { return <Dialog.Root open={open} onOpenChange={onOpenChange}><AnimatePresence>{open ? <Dialog.Portal forceMount><Dialog.Overlay className="fixed inset-0 z-[110] bg-background-primary/80 backdrop-blur" /><Dialog.Content asChild><motion.aside variants={drawerVariants} initial="initial" animate="animate" exit="exit" className="fixed right-0 top-0 z-[110] h-dvh w-full max-w-md border-l border-border bg-background-primary shadow-lg">
  <header className="relative flex h-16 items-center border-b border-border-subtle px-5 md:hidden"><Dialog.Title className="text-base font-medium uppercase tracking-[0.16em] text-text-primary">{title}</Dialog.Title><Dialog.Close className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-accent-gold outline-none transition hover:text-text-primary focus:outline-none focus-visible:outline-none" aria-label={COPY.common.close}><X size={18} strokeWidth={1.7} aria-hidden="true" /></Dialog.Close></header>
  <div className="hidden px-6 pt-6 md:block"><Dialog.Title className="font-display text-xl text-text-primary">{title}</Dialog.Title><Dialog.Close className="absolute right-4 top-4 h-11 w-11 text-text-secondary" aria-label={COPY.common.close}>×</Dialog.Close></div>
  <div className="h-[calc(100dvh-64px)] overflow-y-auto pb-24 md:mx-6 md:mt-8 md:h-[calc(100dvh-96px)] md:pb-8">{children}</div>
</motion.aside></Dialog.Content></Dialog.Portal> : null}</AnimatePresence></Dialog.Root>; }
