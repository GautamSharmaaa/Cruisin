// Governed by .rules v1.0
export type PromotionPopupFrequency = 'once_per_session' | 'once_per_24_hours' | 'always';

export interface ActivePromotionExperience {
  enabled: true;
  campaignKey: string;
  promotion: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed' | 'freeShipping';
    value: number;
    displayValue: string;
    discountLabel: string;
  };
  placements: { popup: boolean; bagMarquee: boolean; checkoutStrip: boolean };
  popup: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    delayMs: number;
    frequency: PromotionPopupFrequency;
  };
  marquee: { available: string; applied: string };
  checkout: { available: string; applied: string };
  schedule: { startsAt?: string | null; endsAt?: string | null };
}

export interface PromotionTemplateValues {
  code: string;
  discount: string;
  saving: string;
}
