import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { ACCESS_COOKIE } from '@/lib/session';

const MAX_BYTES = 5 * 1024 * 1024;

/** Same-origin upload endpoint: attaches the session token and forwards to the API. */
export async function POST(request: NextRequest) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: { message: 'يجب تسجيل الدخول' } }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: { message: 'لم يتم إرسال ملف' } }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: { message: 'الحد الأقصى 5 ميغابايت' } }, { status: 413 });

  const body = new FormData();
  body.set('file', file, file.name);
  const res = await fetch(`${config.apiUrl}/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body });
  return NextResponse.json(await res.json(), { status: res.status });
}
