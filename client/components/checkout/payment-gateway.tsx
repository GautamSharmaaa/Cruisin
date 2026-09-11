// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { partialPaymentAmount, paymentMethodAvailability, type PaymentConfiguration } from '@/lib/payment-availability';
import { formatPrice } from '@/lib/utils';

export type { PaymentConfiguration } from '@/lib/payment-availability';
export interface PaymentGatewayProps { value: string; onChange: (value: 'razorpay' | 'cod' | 'partial') => void; config?: PaymentConfiguration; orderTotal?: number; }
const card = (selected: boolean): string => 'grid min-h-[84px] grid-cols-[28px_minmax(0,1fr)] items-start gap-3 border px-4 py-4 text-left transition duration-300 hover:border-border-strong active:scale-[0.99] md:min-h-16 md:grid-cols-1 md:p-4 ' + (selected ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary');
const disabled = 'cursor-not-allowed border-border-subtle bg-background-primary/50 text-text-muted opacity-65';
export function PaymentGateway({ value, onChange, config, orderTotal = 0 }: PaymentGatewayProps): ReactNode {
  const availability = paymentMethodAvailability(config, orderTotal);
  const codEnabled = availability.cod.enabled;
  const partialEnabled = availability.partial.enabled;
  const advanceAmount = partialPaymentAmount(config, orderTotal);
  const advanceQualifier = config?.partialPaymentFixedAmount === null && config.partialPaymentPercentage ? ` (${config.partialPaymentPercentage}%)` : '';
  const partialDescription = advanceAmount > 0
    ? `Pay ${formatPrice(advanceAmount)} now${advanceQualifier}; ${formatPrice(Math.max(0, orderTotal - advanceAmount))} is due on delivery.`
    : 'Pay the configured advance now; the balance is due on delivery.';
  const radio = (selected: boolean): ReactNode => <span aria-hidden="true" className={'mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 md:hidden ' + (selected ? 'border-accent-gold' : 'border-border')}><span className={'h-3 w-3 rounded-full ' + (selected ? 'bg-accent-gold' : 'bg-transparent')} /></span>;
  return <div className="grid gap-3" role="group" aria-label="Payment method">
    <button type="button" aria-pressed={value === 'razorpay'} onClick={() => onChange('razorpay')} className={card(value === 'razorpay')}>{radio(value === 'razorpay')}<span><span className="block text-base font-medium md:text-sm md:font-normal md:uppercase md:tracking-[0.1em]"><span className="md:hidden">UPI / Online Payment</span><span className="hidden md:inline">Pay online</span></span><span className="mt-2 block text-sm leading-5 text-text-muted md:mt-1 md:text-xs">UPI, cards, netbanking &amp; wallets · secured by Razorpay</span></span></button>
    {config?.codEnabled ? <button type="button" aria-pressed={value === 'cod'} disabled={!codEnabled} onClick={() => onChange('cod')} className={codEnabled ? card(value === 'cod') : card(false) + ' ' + disabled}>{radio(value === 'cod')}<span><span className="block text-base font-medium md:text-sm md:font-normal md:uppercase md:tracking-[0.1em]">Cash on delivery</span><span className="mt-2 block text-sm text-text-muted md:mt-1 md:text-xs">{codEnabled ? 'Pay on arrival' : availability.cod.reason}</span>{codEnabled ? <span className="mt-1 block text-xs text-text-muted">{formatPrice(config.codFee)} COD handling fee</span> : null}</span></button> : null}
    {config?.partialPaymentEnabled || partialEnabled ? <button type="button" aria-pressed={value === 'partial'} disabled={!partialEnabled} onClick={() => onChange('partial')} className={partialEnabled ? card(value === 'partial') : card(false) + ' ' + disabled}>{radio(value === 'partial')}<span><span className="block text-base font-medium md:text-sm md:font-normal md:uppercase md:tracking-[0.1em]">Reserve with an advance</span><span className="mt-2 block text-sm text-text-muted md:mt-1 md:text-xs">{partialEnabled ? partialDescription : availability.partial.reason}</span></span></button> : null}
    <p className="hidden pt-1 text-xs text-text-muted md:block">Secure payments by Razorpay · UPI and cards supported</p>
  </div>;
}
