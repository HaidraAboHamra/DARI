import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Same-origin live data for the city map (polled every 30 s; cached 30 s by the API). */
export async function GET() {
  const res = await fetch(`${config.apiUrl}/map/layers?city=${encodeURIComponent(config.city)}`, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return new Response(null, { status: 502 });
  return new Response(res.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
