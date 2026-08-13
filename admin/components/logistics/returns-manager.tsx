// Governed by .rules v1.0
'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminMe } from '@/hooks/useAdminResources';
import { useAdminReturns, useAdminSetRefundDestination, useWorkflowAction, type WorkflowRequest } from '@/hooks/useLogistics';

const returnActions: Record<string, string[]> = {
  requested: ['approved', 'rejected', 'more_information'], approved: ['create_reverse_pickup'],
  reverse_pickup: ['warehouse_received'], warehouse_received: ['quality_check_passed', 'quality_check_failed'],
  quality_check_passed: ['open_refund_window'], refund_window_open: ['refund_pending'], refund_pending: ['refunded'], refunded: ['closed']
};

export function ReturnsManager(): ReactNode {
  const requests = useAdminReturns();
  const action = useWorkflowAction('returns');
  const setDestination = useAdminSetRefundDestination();
  const me = useAdminMe();
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  const canManageRefund = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  const [manualRequest, setManualRequest] = useState<WorkflowRequest | null>(null);
  const [manualUpiId, setManualUpiId] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [destinationRequest, setDestinationRequest] = useState<WorkflowRequest | null>(null);
  const [destinationMethod, setDestinationMethod] = useState<'wallet' | 'upi'>('wallet');
  const [destinationUpiId, setDestinationUpiId] = useState('');
  const openManualRefund = (request: WorkflowRequest): void => {
    setManualRequest(request);
    setManualUpiId(request.refundDestination?.manualUpiId ?? '');
    setTransactionReference('');
  };
  const recordManualRefund = (): void => {
    if (!manualRequest) return;
    action.mutate({ id: manualRequest._id, action: 'record_manual_upi_refund', upiId: manualUpiId, transactionReference }, { onSuccess: () => { setManualRequest(null); setManualUpiId(''); setTransactionReference(''); } });
  };
  const openDestination = (request: WorkflowRequest): void => {
    const method = request.refundDestination?.method === 'upi' ? 'upi' : 'wallet';
    setDestinationRequest(request);
    setDestinationMethod(method);
    setDestinationUpiId(request.refundDestination?.manualUpiId ?? '');
  };
  const saveDestination = (): void => {
    if (!destinationRequest) return;
    const destination = destinationMethod === 'upi' ? { method: 'upi' as const, upiId: destinationUpiId } : { method: 'wallet' as const };
    setDestination.mutate({ id: destinationRequest._id, destination }, { onSuccess: () => { setDestinationRequest(null); setDestinationUpiId(''); } });
  };
  return <div className="grid gap-4">
    {requests.data?.map((request) => <article key={request._id} className="grid gap-4 border border-border bg-background-elevated p-5 lg:grid-cols-[1fr_auto] lg:items-start">
      <div>
        <p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p>
        <h2 className="mt-2 font-display text-xl">{request.reason?.replaceAll('_', ' ') ?? 'Customer return'}</h2>
        <p className="mt-2 text-sm text-text-secondary">{request.order?.orderNumber ?? 'Order'} · {request.customer?.name ?? request.customer?.phone ?? 'Customer'} · {request.status.replaceAll('_', ' ')} · Refund {request.refundStatus ?? 'not started'}</p>
        {request.items?.length ? <ul className="mt-3 grid gap-1 text-sm text-text-primary">{request.items.map((item) => <li key={`${item.sku}-${item.size}-${item.color}`}>{item.quantity} × {item.title} · {[item.size, item.color].filter(Boolean).join(' / ') || item.sku}</li>)}</ul> : null}
        {request.details ? <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{request.details}</p> : null}
        {request.evidence?.length ? <div className="mt-4 flex flex-wrap gap-3" aria-label="Customer issue photos">{request.evidence.map((photo, index) => <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block border border-border"><img src={photo.url} alt={`Return evidence ${index + 1}`} className="h-24 w-24 object-cover" /></a>)}</div> : null}
        <dl className="mt-4 grid gap-2 text-xs text-text-muted sm:grid-cols-2">
          <div><dt>Handling fee</dt><dd className="mt-1 text-text-primary">₹{request.handlingFee ?? 0} · {request.handlingFeePaymentStatus ?? 'not recorded'}{request.handlingFeePaidAt ? ` · ${new Date(request.handlingFeePaidAt).toLocaleString('en-IN')}` : ''}</dd></div>
          <div><dt>Payment reference</dt><dd className="mt-1 break-all font-mono text-text-primary">{request.handlingFeePaymentReference ?? 'Not available'}</dd></div>
          <div><dt>Eligible product refund</dt><dd className="mt-1 text-text-primary">₹{request.productRefundAmount ?? 0} · {request.refundStatus ?? 'not started'}</dd></div>
          <div><dt>Refund reference</dt><dd className="mt-1 break-all font-mono text-text-primary">{request.productRefundReference ?? 'Not initiated'}</dd></div>
          <div><dt>Refund window</dt><dd className="mt-1 text-text-primary">{request.refundWindowOpenedAt ? `Opened ${new Date(request.refundWindowOpenedAt).toLocaleString('en-IN')}` : 'Not opened'}</dd></div>
          <div><dt>Refund destination</dt><dd className="mt-1 text-text-primary">{request.refundDestination?.method ? `${request.refundDestination.method.replaceAll('_', ' ')} · ${request.refundDestination.verificationStatus?.replaceAll('_', ' ') ?? 'not submitted'}` : 'Not selected yet'}{request.refundDestination?.manualUpiId || request.refundDestination?.maskedDetails ? <span className="mt-1 block break-all text-text-muted">{request.refundDestination.manualUpiId ?? request.refundDestination.maskedDetails}{request.refundDestination.registeredName ? ` · ${request.refundDestination.registeredName}` : ''}</span> : null}{request.refundDestination?.submittedByRole ? <span className="mt-1 block text-text-muted">Added by {request.refundDestination.submittedByRole === 'customer' ? 'customer' : 'Cruisin admin'}</span> : null}</dd></div>
          <div><dt>Reverse shipment</dt><dd className="mt-1 text-text-primary">{request.reverseShipment?.shipmentStatus?.replaceAll('_', ' ') ?? 'Not created'}</dd></div>
          <div><dt>Courier / AWB / pickup</dt><dd className="mt-1 text-text-primary">{request.reverseShipment ? [request.reverseShipment.courierName, request.reverseShipment.awb, request.reverseShipment.pickupStatus].filter(Boolean).join(' · ') || 'Pending provider details' : 'Not scheduled'}</dd></div>
        </dl>
      </div>
      <div className="grid min-w-64 gap-2">{request.status === 'refund_window_open' && request.refundDestination?.verificationStatus !== 'verified' ? <p className="border border-warning/40 bg-warning/10 p-3 text-xs text-text-secondary">{request.refundDestination?.manualUpiId ? 'A manual UPI destination is saved. Transfer externally, verify the beneficiary in your payment app, then record the matching UPI and UTR.' : 'The customer or an authorized admin can now choose Cruisin Wallet or add the customer UPI ID.'}</p> : null}{canManageRefund && request.status === 'refund_window_open' ? <Button variant="secondary" onClick={() => openDestination(request)} disabled={setDestination.isPending}>Set / update refund destination</Button> : null}{canManageRefund && request.status === 'refund_window_open' && request.refundDestination?.method === 'upi' && request.refundDestination.manualUpiId && request.refundDestination.verificationStatus === 'pending' ? <Button onClick={() => openManualRefund(request)} disabled={action.isPending}>Record manual UPI transfer</Button> : null}<div className="flex flex-wrap gap-2">{(returnActions[request.status] ?? []).filter((value) => (value !== 'create_reverse_pickup' || canMutateShiprocket) && (!['open_refund_window', 'refund_pending', 'refunded'].includes(value) || canManageRefund)).map((value) => <Button key={value} variant={value.includes('reject') ? 'secondary' : 'primary'} onClick={() => { if (value === 'refund_pending' && !window.confirm(`Initiate ${request.productRefundAmount ?? 0} INR refund to ${request.refundDestination?.manualUpiId ?? request.refundDestination?.maskedDetails ?? request.refundDestination?.method ?? 'the selected destination'}? This is a financial action.`)) return; action.mutate({ id: request._id, action: value }); }} disabled={action.isPending || (value === 'refund_pending' && request.refundDestination?.verificationStatus !== 'verified')}>{value === 'open_refund_window' ? 'Open refund window' : value === 'refund_pending' ? 'Initiate verified refund' : value.replaceAll('_', ' ')}</Button>)}</div></div>
    </article>)}
    {!requests.isLoading && !requests.data?.length ? <p className="border border-border p-8 text-center text-text-muted">No return requests.</p> : null}
    {action.error ? <p className="text-sm text-danger">{action.error.message}</p> : null}
    {manualRequest ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="manual-upi-refund-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto border border-border bg-background-primary p-5 shadow-2xl sm:p-7"><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Manual COD / offline refund</p><h2 id="manual-upi-refund-title" className="mt-2 font-display text-2xl">Record completed UPI transfer</h2><div className="mt-4 border border-danger/50 bg-danger/10 p-4 text-sm leading-6 text-text-primary">Cruisin does not send money from this form. Continue only after you personally transferred {manualRequest.productRefundAmount ?? 0} INR and your payment app shows success. Recording false completion will mislead the customer.</div><div className="mt-5 grid gap-4"><Input label="Destination UPI ID" value={manualUpiId} onChange={(event) => setManualUpiId(event.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" /><Input label="UPI transaction / UTR reference" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value.trim())} autoCapitalize="characters" autoCorrect="off" /><p className="text-xs leading-5 text-text-muted">The UPI ID must exactly match the saved customer destination. The customer sees the full UPI ID, amount, transfer time, and transaction reference in their private account.</p></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setManualRequest(null)} disabled={action.isPending}>Cancel</Button><Button onClick={recordManualRefund} disabled={action.isPending || !manualUpiId || transactionReference.length < 4}>{action.isPending ? 'Recording…' : 'Confirm transfer & notify customer'}</Button></div></section></div> : null}
    {destinationRequest ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="admin-refund-destination-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto border border-border bg-background-primary p-5 shadow-2xl sm:p-7"><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Customer refund destination</p><h2 id="admin-refund-destination-title" className="mt-2 font-display text-2xl">Choose wallet or UPI</h2><p className="mt-3 text-sm leading-6 text-text-secondary">Set this only from the customer’s confirmed instructions. The customer will see the selected method, the full UPI ID, and that it was added by Cruisin admin.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className={`cursor-pointer border p-4 ${destinationMethod === 'wallet' ? 'border-accent-gold bg-accent-gold/10' : 'border-border'}`}><span className="flex gap-3"><input type="radio" name="admin-refund-method" checked={destinationMethod === 'wallet'} onChange={() => setDestinationMethod('wallet')} /><span><strong className="block text-sm">Cruisin Wallet</strong><span className="mt-1 block text-xs text-text-muted">Credit the customer’s private Cruisin balance.</span></span></span></label><label className={`cursor-pointer border p-4 ${destinationMethod === 'upi' ? 'border-accent-gold bg-accent-gold/10' : 'border-border'}`}><span className="flex gap-3"><input type="radio" name="admin-refund-method" checked={destinationMethod === 'upi'} onChange={() => setDestinationMethod('upi')} /><span><strong className="block text-sm">Customer UPI ID</strong><span className="mt-1 block text-xs text-text-muted">Save the full verified destination for manual transfer.</span></span></span></label></div>{destinationMethod === 'upi' ? <div className="mt-5"><Input label="Customer UPI ID" value={destinationUpiId} onChange={(event) => setDestinationUpiId(event.target.value.toLowerCase())} placeholder="name@bank" autoCapitalize="none" autoCorrect="off" /><p className="mt-2 text-xs leading-5 text-text-muted">Encrypted at rest. Visible in full only to this customer and authorized admin/superadmin accounts.</p></div> : null}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDestinationRequest(null)} disabled={setDestination.isPending}>Cancel</Button><Button onClick={saveDestination} disabled={setDestination.isPending || (destinationMethod === 'upi' && !destinationUpiId.trim())}>{setDestination.isPending ? 'Saving…' : 'Save & show customer'}</Button></div>{setDestination.error ? <p role="alert" className="mt-4 text-sm text-danger">{setDestination.error.message}</p> : null}</section></div> : null}
  </div>;
}
