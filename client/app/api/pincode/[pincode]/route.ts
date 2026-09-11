import { NextResponse } from 'next/server';

interface PostalOffice { District?: string; Division?: string; State?: string; }
interface PostalResponse { Status?: string; PostOffice?: PostalOffice[] | null; }

export async function GET(_request: Request, context: { params: Promise<{ pincode: string }> }): Promise<NextResponse> {
  const { pincode } = await context.params;
  if (!/^[1-9]\d{5}$/.test(pincode)) return NextResponse.json({ message: 'Enter a valid six-digit Indian pincode.' }, { status: 400 });
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(4_000)
    });
    if (!response.ok) return NextResponse.json({ message: 'Pincode lookup unavailable.' }, { status: 503 });
    const payload = await response.json() as PostalResponse[];
    const office = payload[0]?.Status === 'Success' ? payload[0]?.PostOffice?.[0] : undefined;
    const city = office?.District?.trim() || office?.Division?.trim() || '';
    const state = office?.State?.trim() || '';
    if (!city || !state) return NextResponse.json({ message: 'Pincode not found.' }, { status: 404 });
    return NextResponse.json({ city, state }, { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } });
  } catch {
    return NextResponse.json({ message: 'Pincode lookup unavailable.' }, { status: 503 });
  }
}
