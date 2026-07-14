// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function ShippingPolicyPage(): ReactNode {
  return <LegalPage eyebrow="Policy" title="Shipping Policy" intro="Cruisin ships orders to the delivery address provided at checkout and keeps customers informed through order updates." sections={[
    { heading: 'Processing', body: 'Orders are processed after payment confirmation and product availability checks.' },
    { heading: 'Delivery', body: 'Delivery timelines may vary by location, courier availability, holidays, and weather or service disruptions.' },
    { heading: 'Support', body: 'For shipping help, contact support@cruisin.co.in or WhatsApp +91 - 8287846203.' }
  ]} />;
}
export const metadata: Metadata = { title: 'Shipping Policy', description: 'Cruisin order processing, delivery, and shipping support information.', alternates: { canonical: '/shipping-policy' } };
