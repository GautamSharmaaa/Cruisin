// Governed by .rules v1.0
export const API_CONFIG = { baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1', timeout: 12_000 } as const;
export const IDENTITY_CONFIG = { googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '' } as const;
export const BRAND_CONFIG = { name: 'Cruisin', tagline: 'Wear Less. Mean More.', currency: 'INR' } as const;
export const SITE_CONFIG = { url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '') } as const;
