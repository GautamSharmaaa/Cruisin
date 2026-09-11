// Governed by .rules v1.0
export interface PaymentConfiguration { paymentMode: 'test' | 'live'; codEnabled: boolean; codFee: number; partialPaymentEnabled: boolean; partialPaymentPercentage: number | null; partialPaymentFixedAmount: number | null; minPartialPaymentOrderValue: number; maxCodOrderValue: number; returnHandlingFee?: number; }
export interface PaymentMethodAvailability { cod: { enabled: boolean; reason: string }; partial: { enabled: boolean; reason: string }; }

export const partialPaymentAmount = (config: PaymentConfiguration | undefined, orderTotal: number): number => {
  if (!config?.partialPaymentEnabled || orderTotal <= 0) return 0;
  const configuredAdvance = config.partialPaymentFixedAmount ?? orderTotal * ((config.partialPaymentPercentage ?? 0) / 100);
  return Math.round((Math.min(orderTotal, Math.max(0, configuredAdvance)) + Number.EPSILON) * 100) / 100;
};

export const paymentMethodAvailability = (config: PaymentConfiguration | undefined, orderTotal: number): PaymentMethodAvailability => {
  if (!config) return { cod: { enabled: false, reason: 'Checking availability.' }, partial: { enabled: false, reason: 'Checking availability.' } };
  const partial = !config.partialPaymentEnabled ? { enabled: false, reason: 'Advance payment is currently unavailable.' } : orderTotal < config.minPartialPaymentOrderValue ? { enabled: false, reason: `Available from ₹${config.minPartialPaymentOrderValue.toLocaleString('en-IN')}.` } : { enabled: true, reason: '' };
  if (!config.codEnabled) return { cod: { enabled: false, reason: 'Unavailable for this checkout.' }, partial };
  const cod = orderTotal > config.maxCodOrderValue ? { enabled: false, reason: `Available up to ₹${config.maxCodOrderValue.toLocaleString('en-IN')}.` } : { enabled: true, reason: 'Pay safely when your order arrives.' };
  return { cod, partial };
};
