// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { paymentMethodAvailability, type PaymentConfiguration } from '@/lib/payment-availability';

export type { PaymentConfiguration } from '@/lib/payment-availability';
export interface PaymentGatewayProps { value: string; onChange: (value: 'razorpay' | 'cod' | 'partial') => void; config?: PaymentConfiguration; orderTotal?: number; }
const card = (selected: boolean): string => 'min-h-16 border p-4 text-left transition duration-300 hover:border-border-strong active:scale-[0.98] ' + (selected ? 'border-accent-gold bg-background-elevated text-text-primary shadow-gold' : 'border-border text-text-secondary');
const disabled = 'cursor-not-allowed border-border-subtle bg-background-primary/50 text-text-muted opacity-65';
export function PaymentGateway({ value, onChange, config, orderTotal = 0 }: PaymentGatewayProps): ReactNode {
  const availability = paymentMethodAvailability(config, orderTotal);
  const codEnabled = availability.cod.enabled;
  const partialEnabled = availability.partial.enabled;
  const advance = config?.partialPaymentFixedAmount ? `₹${config.partialPaymentFixedAmount.toLocaleString('en-IN')}` : config?.partialPaymentPercentage ? `${config.partialPaymentPercentage}%` : 'configured advance';
  return <div className="grid gap-3"><button type="button" onClick={() => onChange('razorpay')} className={card(value === 'razorpay')}><span className="block text-sm uppercase tracking-[0.1em]">Pay online</span><span className="mt-1 block text-xs text-text-muted">UPI, cards, netbanking &amp; wallets · secured by Razorpay</span></button><button type="button" disabled={!codEnabled} onClick={() => onChange('cod')} className={codEnabled ? card(value === 'cod') : card(false) + ' ' + disabled}><span className="block text-sm uppercase tracking-[0.1em]">Cash on delivery</span><span className="mt-1 block text-xs text-text-muted">{availability.cod.reason}</span></button><button type="button" disabled={!partialEnabled} onClick={() => onChange('partial')} className={partialEnabled ? card(value === 'partial') : card(false) + ' ' + disabled}><span className="block text-sm uppercase tracking-[0.1em]">Reserve with an advance</span><span className="mt-1 block text-xs text-text-muted">{partialEnabled ? `Pay ${advance} now; the balance is due on delivery.` : availability.partial.reason}</span></button><p className="pt-1 text-xs text-text-muted">Secure payments by Razorpay · UPI and cards supported</p></div>;
}
