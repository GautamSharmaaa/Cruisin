'use client';

import { AlertTriangle, Check, Clock3 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal } from '@/components/shared/modal';
import { useCancelOrder } from '@/hooks/useOrders';
import { CUSTOMER_CANCELLATION_REASONS, cancellationDetailsAreValid, orderId } from '@/lib/order-cancellation';
import type { CancellationReasonCode, Order } from '@/types/order.types';

export interface OrderCancellationDialogProps {
  order: Pick<Order, 'id' | '_id' | 'orderNumber' | 'amountPaid' | 'paymentMode'>;
  compact?: boolean;
}

const THINKING_SECONDS = 5;

export function OrderCancellationDialog({ order, compact = false }: OrderCancellationDialogProps): ReactNode {
  const id = orderId(order);
  const cancellation = useCancelOrder(id);
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode | ''>('');
  const [details, setDetails] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(THINKING_SECONDS);

  useEffect(() => {
    setSecondsLeft(THINKING_SECONDS);
    if (!open || !reasonCode) return;
    const timer = window.setInterval(() => setSecondsLeft((seconds) => {
      if (seconds <= 1) {
        window.clearInterval(timer);
        return 0;
      }
      return seconds - 1;
    }), 1_000);
    return () => window.clearInterval(timer);
  }, [open, reasonCode]);

  const setDialogOpen = (nextOpen: boolean): void => {
    if (cancellation.isPending) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setReasonCode('');
      setDetails('');
      cancellation.reset();
    }
  };

  const submit = (): void => {
    if (!reasonCode || secondsLeft > 0 || !cancellationDetailsAreValid(reasonCode, details)) return;
    cancellation.mutate({ reasonCode, details: details.trim() || undefined }, { onSuccess: () => setOpen(false) });
  };

  return <>
    <button type="button" onClick={() => setDialogOpen(true)} className={compact ? 'inline-flex min-h-10 items-center justify-center border border-danger/70 bg-danger/10 px-4 text-xs uppercase tracking-[0.12em] text-danger transition hover:border-danger hover:bg-danger/20 hover:text-text-primary' : 'inline-flex min-h-10 items-center justify-center border border-danger bg-danger px-4 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:scale-[0.98]'}>
      Cancel order
    </button>
    <Modal open={open} onOpenChange={setDialogOpen} title="Cancel this order?">
      <div className="max-h-[calc(100dvh-19rem)] overflow-y-auto overscroll-contain pr-1 sm:max-h-[58dvh]">
        <div className="border-l-2 border-warning bg-warning/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />This cannot be undone</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Order {order.orderNumber ?? id} will be cancelled. {Number(order.amountPaid ?? 0) > 0 ? 'Your payment is not lost: the Cruisin team will review and issue the eligible refund from the admin dashboard.' : 'No refund is required because no payment was collected.'}</p>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-text-primary">Why are you cancelling?</legend>
          <p className="mt-1 text-xs text-text-muted">Select one reason. This helps us improve future orders.</p>
          <div className="mt-4 grid gap-2">
            {CUSTOMER_CANCELLATION_REASONS.map((reason) => <label key={reason.code} className={`grid cursor-pointer grid-cols-[20px_1fr] gap-3 border p-3 transition ${reasonCode === reason.code ? 'border-accent-gold bg-accent-gold/5' : 'border-border hover:border-border-strong'}`}>
              <input type="radio" name={`cancel-reason-${id}`} value={reason.code} checked={reasonCode === reason.code} onChange={() => setReasonCode(reason.code)} className="mt-1 accent-[#c8a97e]" />
              <span><span className="flex items-center gap-2 text-sm text-text-primary">{reason.label}{reasonCode === reason.code ? <Check className="h-3.5 w-3.5 text-accent-gold" aria-hidden="true" /> : null}</span><span className="mt-0.5 block text-xs leading-5 text-text-muted">{reason.description}</span></span>
            </label>)}
          </div>
        </fieldset>

        {reasonCode === 'other' ? <label className="mt-5 block text-sm text-text-primary">
          Tell us more <span className="text-danger">*</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value.slice(0, 500))} rows={4} minLength={10} maxLength={500} required placeholder="Please enter at least 10 characters" className="mt-2 w-full resize-y border border-border bg-background-input p-3 text-sm text-text-primary placeholder:text-text-muted" />
          <span className={`mt-1 flex justify-between text-xs ${details.length > 0 && details.trim().length < 10 ? 'text-danger' : 'text-text-muted'}`}><span>{details.length > 0 && details.trim().length < 10 ? 'Enter at least 10 characters.' : 'Required for Other.'}</span><span>{details.length}/500</span></span>
        </label> : null}

        {cancellation.isError ? <p role="alert" className="mt-4 border border-danger/50 bg-danger/10 p-3 text-sm text-text-primary">{cancellation.error instanceof Error ? cancellation.error.message : 'Cancellation could not be completed. Please try again.'}</p> : null}

      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <button type="button" disabled={cancellation.isPending} onClick={() => setDialogOpen(false)} className="min-h-11 border border-border px-5 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50">Keep my order</button>
        <button type="button" disabled={secondsLeft > 0 || !cancellationDetailsAreValid(reasonCode, details) || cancellation.isPending} onClick={submit} className="inline-flex min-h-11 min-w-52 items-center justify-center gap-2 bg-danger px-5 text-xs uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {!reasonCode ? 'Select a reason to continue' : secondsLeft > 0 ? <><Clock3 className="h-4 w-4" aria-hidden="true" />Confirm cancellation in {secondsLeft}s</> : cancellation.isPending ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
      </div>
    </Modal>
  </>;
}
