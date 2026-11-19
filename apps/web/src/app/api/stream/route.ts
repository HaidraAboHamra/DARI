import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { ACCESS_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Same-origin SSE proxy: the browser never sees the access token. */
export async function GET(request: Request) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return new Response(null, { status: 204 });
  const upstream = await fetch(`${config.apiUrl}/stream`, {
    headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
    signal: request.signal,
    cache: 'no-store',
  }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response(null, { status: upstream?.status === 401 ? 204 : 502 });
  return new Response(upstream.body, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' },
  });
}
