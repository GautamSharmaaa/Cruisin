// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StorefrontManager } from '@/components/storefront/storefront-manager';
import { COPY } from '@/constants/copy';

export default function DeliveryPage(): ReactNode {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={COPY.brand.eyebrow}
        title="Delivery"
        subtitle="Set delivery charges, free-delivery thresholds, and automatic delivery promotions shown in the cart and checkout."
      />
      <StorefrontManager initialTab="delivery" />
    </div>
  );
}
