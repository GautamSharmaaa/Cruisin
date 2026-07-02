// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function TermsAndConditionPage(): ReactNode {
  return <LegalPage eyebrow="Policy" title="Terms and condition" intro="These terms apply when browsing Cruisin, placing orders, and using customer support services." sections={[
    { heading: 'Store Use', body: 'Customers agree to provide accurate account, contact, shipping, and payment information when placing an order.' },
    { heading: 'Products', body: 'Product availability, prices, offers, and descriptions may change as inventory and campaigns are updated.' },
    { heading: 'Orders', body: 'Cruisin may verify, cancel, or update orders where required for payment, inventory, delivery, or fraud-prevention reasons.' },
    { heading: 'Contact', body: 'For help with these terms, email support@cruisin.co.in.' }
  ]} />;
}
