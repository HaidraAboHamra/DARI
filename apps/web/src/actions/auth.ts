'use server';

import type { AuthTokens } from '@dari/contracts';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, str, toActionError } from '@/lib/action-result';
import { clearSession, saveSession } from '@/lib/session';

export async function requestOtp(_: ActionState, form: FormData): Promise<ActionState & { phone?: string }> {
  const phone = str(form, 'phone');
  if (!phone) return { error: 'أدخل رقم الموبايل' };
  try {
    await api('/auth/otp/request', { method: 'POST', body: { phone }, authenticated: false });
    return { ok: true, phone };
  } catch (err) {
    return { ...toActionError(err), phone };
  }
}

export async function verifyOtp(_: ActionState, form: FormData): Promise<ActionState> {
  const phone = str(form, 'phone');
  const code = str(form, 'code');
  const next = safeNext(str(form, 'next'));
  try {
    const tokens = await api<AuthTokens>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code, deviceName: 'web' },
      authenticated: false,
    });
    await saveSession(tokens);
  } catch (err) {
    return toActionError(err);
  }
  redirect(next);
}

export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await clearSession();
  redirect('/');
}

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api('/me', { method: 'PATCH', body: { name: str(form, 'name') } });
    return { ok: true, message: 'تم الحفظ' };
  } catch (err) {
    return toActionError(err);
  }
}

/** Only same-site relative paths, to prevent open redirects. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
