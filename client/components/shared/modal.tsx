// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface ModalProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; }
export function Modal({ open, onOpenChange, title, children }: ModalProps): ReactNode { return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-background-primary/80 backdrop-blur" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 border border-border bg-background-elevated p-6 shadow-lg"><Dialog.Title className="font-display text-xl text-text-primary">{title}</Dialog.Title><div className="mt-6">{children}</div><Dialog.Close className="absolute right-4 top-4 h-11 w-11 text-text-secondary hover:text-text-primary" aria-label={COPY.common.close}>×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>; }
