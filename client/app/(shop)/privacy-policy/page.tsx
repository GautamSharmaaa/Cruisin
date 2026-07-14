// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function PrivacyPolicyPage(): ReactNode {
  return <LegalPage eyebrow="Policy" title="Privacy Policy" intro="This policy explains how Cruisin handles customer information for orders, support, and shopping experiences." sections={[
    { heading: 'Information We Use', body: 'We use information such as contact details, shipping details, order history, and support messages to process purchases and help customers.' },
    { heading: 'Payments', body: 'Payment details are processed through secure payment partners. Cruisin does not store complete card or payment credentials on the storefront.' },
    { heading: 'Support and Updates', body: 'We may contact you about orders, delivery, returns, or support requests using the details you provide.' },
    { heading: 'Contact', body: 'For privacy questions, email support@cruisin.co.in.' }
  ]} />;
}
export const metadata: Metadata = { title: 'Privacy Policy', description: 'How Cruisin handles customer, order, and support information.', alternates: { canonical: '/privacy-policy' } };
