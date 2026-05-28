// Governed by .rules v1.0
export const API_CONFIG = { baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1', timeout: 12_000, accessTokenKey: 'cruisin_admin_access_token' } as const;
export const PRODUCT_FORM_DEFAULTS = { colorHex: '#080808', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85' } as const;
