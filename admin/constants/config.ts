// Governed by .rules v1.0
export const API_CONFIG = { baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1', timeout: 12_000 } as const;
export const IDENTITY_CONFIG = { googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '' } as const;
export const PRODUCT_FORM_DEFAULTS = { colorHex: '#080808', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85' } as const;
export const CATEGORY_FORM_DEFAULTS = { image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85', isActive: true, sortOrder: 0 } as const;
export const BANNER_FORM_DEFAULTS = { image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1600&q=85', mobileImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85', position: 'home-hero', sortOrder: 0, isActive: true } as const;
