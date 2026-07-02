// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { LegalPage } from '@/components/content/legal-page';

export default function AboutUsPage(): ReactNode {
  return <LegalPage eyebrow="Cruisin" title="About Us" intro="Cruisin creates everyday movement wear with comfortable fabrics, modern fits, and a confidence-first streetwear attitude." sections={[
    { heading: 'Our Range', body: 'We offer shorts, pants, trousers, and track pants designed for effortless movement and daily wear.' },
    { heading: 'Our Fit Philosophy', body: 'Every piece is shaped around comfort, versatility, and modern styling so it can move from relaxed routines to statement streetwear.' },
    { heading: 'Support', body: 'Our customer support team is available 24/7 at support@cruisin.co.in and +91 - 8287846203.' }
  ]} />;
}
