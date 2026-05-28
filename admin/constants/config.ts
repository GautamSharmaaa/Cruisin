// Governed by .rules v1.0
export const API_CONFIG = { baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1', timeout: 12_000, accessTokenKey: 'cruisin_admin_access_token' } as const;
