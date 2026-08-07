export interface CheckoutPaymentSession {
  order: { total?: number };
  payment: { amount?: number; currency?: string } | null;
  amountToPay: number;
}

const validMoney = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const sameMoney = (left: number, right: number): boolean => Math.abs(left - right) < 0.005;

export const checkoutPaymentSessionIssue = (
  session: CheckoutPaymentSession,
  displayedTotal: number,
  paymentMode: 'online' | 'partial'
): string | null => {
  const serverTotal = session.order.total;
  if (!validMoney(serverTotal) || !validMoney(displayedTotal) || !sameMoney(serverTotal, displayedTotal)) {
    return 'Your bag total changed before payment. Review the refreshed total and try again.';
  }
  if (!validMoney(session.amountToPay) || session.amountToPay <= 0) return 'The payment amount is invalid. Please retry checkout.';
  if (paymentMode === 'online' && !sameMoney(session.amountToPay, serverTotal)) return 'The secure payment amount does not match your order total. Please retry checkout.';
  if (paymentMode === 'partial' && session.amountToPay > serverTotal) return 'The secure advance exceeds your order total. Please retry checkout.';
  if (!session.payment) return 'A payment session could not be created. Please retry.';
  if (session.payment.currency && session.payment.currency !== 'INR') return 'The secure payment currency is invalid. Please retry checkout.';
  if (validMoney(session.payment.amount) && !sameMoney(session.payment.amount, session.amountToPay)) return 'The payment provider amount does not match your checkout. Please retry.';
  return null;
};
