export interface RazorpaySuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }
export const razorpayPrefillContact = (phone: string | undefined, paymentMode: 'test' | 'live' | undefined): string | undefined => {
  const normalized = (phone ?? '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (/^[6-9]\d{9}$/.test(normalized)) return normalized;
  return paymentMode === 'test' ? '9988776655' : undefined;
};
interface RazorpayOptions { key: string; amount: number; currency: string; name: string; description: string; order_id: string; prefill?: { name?: string; email?: string; contact?: string }; handler: (response: RazorpaySuccess) => void; modal: { ondismiss: () => void }; theme: { color: string }; }
interface RazorpayInstance { open: () => void; close: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void; }
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance; } }

export const loadRazorpay = async (): Promise<void> => {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Secure payment checkout could not be loaded.'));
    document.head.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Secure payment checkout is unavailable.');
};
