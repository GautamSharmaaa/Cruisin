// Governed by .rules v1.0
export const runtime = 'nodejs';

export const GET = (): Response => Response.json({ status: 'ok', service: 'admin' });
