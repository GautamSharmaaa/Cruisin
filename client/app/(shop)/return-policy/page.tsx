// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function ReturnPolicyPage(): ReactNode {
  return <LegalPage eyebrow="Policy" title="Returns & Exchange Policy" intro="Eligible Cruisin orders may be returned or exchanged within five days of delivery through the secure request flow in your account." sections={[
    { heading: 'Five-Day Window', body: 'A return or exchange request must be submitted within five calendar days of the recorded delivery date. The option becomes available after the order is marked delivered and closes automatically when the five-day window ends.' },
    { heading: 'Item Condition', body: 'Items must be unused, unworn, unwashed, and returned with their original packaging and tags. Cruisin completes a quality inspection after the item is received. Items that do not pass inspection may not qualify for a product refund or replacement.' },
    { heading: 'How To Request', body: 'Sign in, open Account → Orders, select the delivered order, and choose Return or Exchange. You must select the issue and upload between one and five clear photographs. Additional written details are optional. Requests cannot be submitted without photographic evidence.' },
    { heading: '₹100 Handling Fee', body: 'A ₹100 handling fee applies once to each return request and once to each exchange request. The fee is collected securely through Razorpay before the request is submitted and is separate from the value of any eligible product refund.' },
    { heading: 'Exchange Choices', body: 'An exchange can be requested only for another available size or colour of the same product. The replacement must be in stock, and final availability is confirmed when Cruisin reviews and approves the request.' },
    { heading: 'Pickup & Inspection', body: 'After approval, Cruisin arranges the reverse-shipment process and shows its progress in your account. A refund or replacement is processed only after the returned product is received and successfully inspected by the Cruisin team.' },
    { heading: 'Refund Destination', body: 'For an eligible refund, available destinations may include the original payment method, Cruisin Wallet, or a verified UPI ID. COD orders can be refunded to Cruisin Wallet or a verified UPI ID. The selected destination and refund status are shown in your account; a manual UPI transfer reference recorded by an administrator is also shown to you.' },
    { heading: 'Refund Amount', body: 'The eligible product refund is calculated from the amount paid for the returned merchandise. Delivery, COD, return or exchange handling, and other non-product charges are accounted for separately and are not presented as product value.' },
    { heading: 'Support', body: 'If the account flow is unavailable or you need help with an existing request, contact support@cruisin.co.in or WhatsApp +91 8287846203 with your order number. Contacting support does not extend the five-day request window.' }
  ]} />;
}
export const metadata: Metadata = { title: 'Returns & Exchange Policy', description: 'Cruisin five-day return and exchange eligibility, ₹100 handling fee, inspection, replacement, and refund information.', alternates: { canonical: '/return-policy' } };
