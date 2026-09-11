// Governed by .rules v1.0
'use client';

import { CheckCircle2, Circle, Landmark, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomerWallet, useRefreshRefundDestination, useSubmitRefundDestination, type CustomerReturn, type RefundDestinationInput, type RefundMethod } from '@/hooks/useReturns';
import { formatPrice } from '@/lib/utils';

const methodCopy: Record<RefundMethod, { title: string; body: string }> = {
  original_payment: { title: 'Original payment method', body: 'Razorpay returns the money to the same card, bank account or UPI source used to pay.' },
  wallet: { title: 'Cruisin Wallet', body: 'Instant store credit in your account, ready for future purchases and membership benefits.' },
  upi: { title: 'UPI refund', body: 'Submit the UPI ID where you want to receive this refund.' },
  bank: { title: 'Verified bank account', body: 'Your bank account is validated before an admin can send the payout.' }
};

const milestones = (request: CustomerReturn) => {
  const rank: Record<string, number> = { payment_pending: 0, requested: 1, more_information: 1, approved: 2, reverse_pickup: 3, in_transit: 3, warehouse_received: 4, quality_check_passed: 5, quality_check_failed: 5, refund_window_open: 6, refund_pending: 7, refunded: 8, closed: 9 };
  const current = rank[request.status] ?? 0;
  return [
    ['Request submitted', 1], ['Return approved', 2], ['Return in transit', 3], ['Received by Cruisin', 4], ['Product analysed', 5],
    ['Refund method', 6], ['Refund initiated', 7], ['Refund completed', 8]
  ].map(([label, value]) => ({ label: String(label), done: current >= Number(value), active: current === Number(value) }));
};

export function ReturnRefundProgress({ request }: { request: CustomerReturn }): ReactNode {
  return <section className="mt-5 border border-border bg-background-primary p-4 sm:p-5" aria-label="Return and refund progress"><h3 className="font-display text-lg">Return & refund progress</h3><ol className="mt-4 grid gap-0 sm:grid-cols-4 lg:grid-cols-8">{milestones(request).map((step, index) => <li key={step.label} className="relative flex min-h-12 gap-3 pb-4 sm:block sm:pb-0"><span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${step.done ? 'border-success bg-success text-text-inverse' : step.active ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border bg-background-elevated text-text-muted'}`}>{step.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span>{index < 7 ? <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px sm:left-7 sm:top-[13px] sm:h-px sm:w-[calc(100%-1.75rem)] ${step.done ? 'bg-success' : 'bg-border'}`} /> : null}<span className={`text-xs leading-5 sm:mt-2 sm:block sm:pr-3 ${step.done || step.active ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</span></li>)}</ol></section>;
}

export function RefundDestinationPanel({ request }: { request: CustomerReturn }): ReactNode {
  const available = request.refundAvailableMethods ?? [];
  const [method, setMethod] = useState<RefundMethod>(request.refundDestination?.method ?? available[0] ?? 'wallet');
  const [upiId, setUpiId] = useState(request.refundDestination?.upiId ?? '');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [editingExisting, setEditingExisting] = useState(false);
  const submit = useSubmitRefundDestination();
  const refresh = useRefreshRefundDestination();
  const wallet = useCustomerWallet();
  useEffect(() => { if (!available.includes(method) && available[0]) setMethod(available[0]); }, [available, method]);
  useEffect(() => {
    if (request.refundDestination?.method && available.includes(request.refundDestination.method)) setMethod(request.refundDestination.method);
    if (request.refundDestination?.upiId) setUpiId(request.refundDestination.upiId);
    setEditingExisting(false);
  }, [available, request.refundDestination?.method, request.refundDestination?.upiId]);

  const destinationDetails = request.refundDestination?.method === 'upi'
    ? request.refundDestination.upiId ?? request.refundDestination.maskedDetails
    : request.refundDestination?.maskedDetails;
  const submittedBy = request.refundDestination?.submittedByRole === 'customer' ? 'Added by you' : request.refundDestination?.submittedByRole ? 'Added by Cruisin admin' : undefined;
  const keepCurrentDestination = (): void => {
    if (request.refundDestination?.method) setMethod(request.refundDestination.method);
    setUpiId(request.refundDestination?.upiId ?? '');
    setEditingExisting(false);
  };

  if (request.status !== 'refund_window_open') {
    if (!request.refundDestination?.method && !['refund_pending', 'refunded', 'closed'].includes(request.status)) return null;
    return <section className="mt-5 border border-border bg-background-primary p-4 sm:p-5"><p className="text-xs uppercase tracking-[0.12em] text-accent-gold">Refund destination</p><p className="mt-2 break-all text-sm text-text-primary">{destinationDetails ?? 'Destination recorded'} · {request.refundDestination?.verificationStatus?.replaceAll('_', ' ') ?? request.refundStatus.replaceAll('_', ' ')}</p>{submittedBy ? <p className="mt-1 text-xs text-text-muted">{submittedBy}</p> : null}{request.refundDestination?.registeredName ? <p className="mt-1 text-xs text-text-muted">Verified name: {request.refundDestination.registeredName}</p> : null}{request.manualTransferReference ? <p className="mt-2 break-all text-xs text-success">Manual UPI transfer recorded · UTR {request.manualTransferReference}{request.manualTransferredAt ? ` · ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.manualTransferredAt))}` : ''}</p> : null}</section>;
  }
  if (request.refundDestination?.verificationStatus === 'verified' && !editingExisting) return <section className="mt-5 border border-success/40 bg-success/10 p-4 sm:p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /><div className="min-w-0"><h3 className="font-display text-lg">Refund destination verified</h3><p className="mt-1 break-all text-sm text-text-secondary">{destinationDetails} · {request.refundDestination.registeredName ?? 'Identity verified'}</p>{submittedBy ? <p className="mt-1 text-xs text-text-muted">{submittedBy}</p> : null}<p className="mt-2 text-xs text-text-muted">Cruisin admin can now initiate {formatPrice(request.productRefundAmount ?? 0)}. You do not need to share OTPs or payment PINs.</p><Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => setEditingExisting(true)}>Change refund destination</Button></div></div></section>;

  const save = (): void => {
    let destination: RefundDestinationInput;
    if (method === 'upi') destination = { method, upiId };
    else if (method === 'bank') destination = { method, accountHolderName, accountNumber, confirmAccountNumber, ifsc: ifsc.toUpperCase() };
    else destination = { method };
    submit.mutate({ requestId: request._id, destination });
  };
  const pendingVerification = request.refundDestination?.verificationStatus === 'pending';
  const manualUpiPending = pendingVerification && request.refundDestination?.method === 'upi' && request.refundUpiMode === 'manual_admin';
  return <section className="mt-5 border border-accent-gold/60 bg-accent-gold/5 p-4 sm:p-6" aria-labelledby={`refund-title-${request._id}`}><div className="flex gap-3"><Landmark className="mt-1 h-5 w-5 shrink-0 text-accent-gold" /><div><p className="text-xs uppercase tracking-[0.12em] text-accent-gold">Action required</p><h3 id={`refund-title-${request._id}`} className="mt-1 font-display text-xl">Choose where {formatPrice(request.productRefundAmount ?? 0)} should go</h3><p className="mt-2 text-sm leading-6 text-text-secondary">You or a Cruisin admin can select Cruisin Wallet or add your UPI ID. The admin initiates money movement only after verification.</p></div></div>
    {pendingVerification && !editingExisting ? <div className="mt-5 border border-warning/40 bg-warning/10 p-4"><p className="break-all text-sm text-text-primary">{manualUpiPending ? `UPI ID ${destinationDetails ?? ''} is submitted${submittedBy ? ` · ${submittedBy}` : ''}. Cruisin admin will transfer the refund manually and record the UTR here.` : `Verification is processing for ${destinationDetails ?? ''}.`}</p>{manualUpiPending ? <p className="mt-2 text-xs leading-5 text-text-muted">No automated transfer has occurred. Never share a UPI PIN or OTP with anyone.</p> : <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => refresh.mutate(request._id)} isLoading={refresh.isPending}><RefreshCw className="h-4 w-4" />Refresh verification</Button>}<Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => setEditingExisting(true)}>Change refund destination</Button></div> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{available.map((value) => <label key={value} className={`min-h-28 cursor-pointer border p-4 ${method === value ? 'border-accent-gold bg-accent-gold/10' : 'border-border bg-background-elevated'}`}><span className="flex gap-3"><input type="radio" name={`refund-method-${request._id}`} value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1 h-5 w-5" /><span><strong className="flex items-center gap-2 text-sm text-text-primary">{value === 'wallet' ? <WalletCards className="h-4 w-4" /> : null}{methodCopy[value].title}</strong><span className="mt-2 block text-xs leading-5 text-text-secondary">{value === 'upi' && request.refundUpiMode === 'manual_admin' ? 'Cruisin admin transfers manually after product analysis, then records the matching UPI ID and UTR for you.' : methodCopy[value].body}</span>{value === 'wallet' ? <span className="mt-2 block text-xs text-accent-gold">Current balance {wallet.data ? formatPrice(wallet.data.availableBalance) : 'loading…'}</span> : null}</span></span></label>)}</div>
      {method === 'upi' ? <div className="mt-5"><Input label="UPI ID" value={upiId} onChange={(event) => setUpiId(event.target.value.toLowerCase())} placeholder="name@bank" autoCapitalize="none" autoCorrect="off" inputMode="email" /></div> : null}
      {method === 'bank' ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Account holder name" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} autoComplete="name" /><Input label="IFSC" value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" /><Input label="Bank account number" type="password" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))} autoComplete="off" /><Input label="Confirm account number" type="password" inputMode="numeric" value={confirmAccountNumber} onChange={(event) => setConfirmAccountNumber(event.target.value.replace(/\D/g, ''))} autoComplete="off" /></div> : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"><Button className="min-h-12 w-full sm:w-auto" onClick={save} isLoading={submit.isPending} disabled={!available.length || (method === 'upi' && !upiId.trim())}>{method === 'upi' && request.refundUpiMode === 'manual_admin' ? 'Confirm UPI destination' : 'Verify & save destination'}</Button>{editingExisting ? <Button variant="secondary" className="min-h-12 w-full sm:w-auto" onClick={keepCurrentDestination} disabled={submit.isPending}>Keep current destination</Button> : null}<p className="text-xs leading-5 text-text-muted">{method === 'upi' && request.refundUpiMode === 'manual_admin' ? 'Your UPI ID is encrypted in Cruisin. You and authorized refund admins can see the full ID; managers and other customers cannot.' : 'Bank and UPI details are sent for provider verification and protected in Cruisin.'}</p></div>
    </>}
    {submit.error ? <p role="alert" className="mt-4 text-sm text-danger">{submit.error.message}</p> : null}{refresh.error ? <p role="alert" className="mt-4 text-sm text-danger">{refresh.error.message}</p> : null}
  </section>;
}
