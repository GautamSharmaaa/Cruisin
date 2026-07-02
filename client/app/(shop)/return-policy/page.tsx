// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function ReturnPolicyPage(): ReactNode {
  return <LegalPage eyebrow="Policy" title="Return Policy" intro="Cruisin supports customer-friendly return handling for eligible items according to order condition and support review." sections={[
    { heading: 'Eligibility', body: 'Items should be unused, unworn, and returned with original packaging, tags, and order details where applicable.' },
    { heading: 'How To Request', body: 'Contact support@cruisin.co.in or call +91 - 8287846203 with your order details to start a return request.' },
    { heading: 'Review', body: 'Returned items are reviewed before approval, replacement, store credit, or refund processing.' }
  ]} />;
}
