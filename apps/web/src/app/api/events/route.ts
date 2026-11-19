import { analyticsBatchSchema } from '@dari/contracts';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { ACCESS_COOKIE } from '@/lib/session';

const ANON_COOKIE = 'dari_anon';

/** Same-origin analytics endpoint: adds identity server-side and forwards to the API. */
export async function POST(request: NextRequest) {
  const parsed = analyticsBatchSchema.safeParse({ ...(await request.json().catch(() => ({}))), citySlug: config.city });
  if (!parsed.success) return NextResponse.json({ accepted: 0 }, { status: 400 });

  const jar = await cookies();
  const anonymousId = jar.get(ANON_COOKIE)?.value ?? crypto.randomUUID();
  const token = jar.get(ACCESS_COOKIE)?.value;

  await fetch(`${config.apiUrl}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ ...parsed.data, anonymousId }),
  }).catch(() => undefined);

  const response = NextResponse.json({ accepted: parsed.data.events.length }, { status: 202 });
  response.cookies.set(ANON_COOKIE, anonymousId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 365 * 86_400 });
  return response;
}
