'use server';

import type { PlatformRole, UserProfile } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';

export async function recordPayment(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const res = await api<{ expiresAt: string }>(`/admin/businesses/${str(form, 'businessId')}/payments`, {
      method: 'POST',
      body: { plan: str(form, 'plan'), months: int(form, 'months'), amount: int(form, 'amount'), method: str(form, 'method'), reference: str(form, 'reference') },
    });
    revalidatePath('/admin');
    return { ok: true, message: `تم التفعيل حتى ${new Date(res.expiresAt).toLocaleDateString('ar-SY')}` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function featureBusiness(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/admin/businesses/${str(form, 'businessId')}/featured`, { method: 'PATCH', body: { days: int(form, 'days') ?? 0 } });
    return { ok: true, message: 'تم التحديث' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setUserRole(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await api<UserProfile>('/admin/users', { query: { phone: str(form, 'phone') } });
    const updated = await api<UserProfile>(`/admin/users/${user.id}/role`, { method: 'PATCH', body: { role: str(form, 'role') as PlatformRole } });
    return { ok: true, message: `${updated.name ?? updated.phone} أصبح ${updated.role}` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function publishArticle(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api('/news', {
      method: 'POST',
      body: {
        citySlug: process.env.NEXT_PUBLIC_CITY ?? 'salamiyah',
        title: str(form, 'title'),
        summary: str(form, 'summary'),
        body: str(form, 'body'),
        category: str(form, 'category'),
        coverUrl: str(form, 'coverUrl'),
        status: form.get('draft') === 'on' ? 'draft' : 'published',
      },
    });
    revalidatePath('/news');
    revalidatePath('/');
    return { ok: true, message: form.get('draft') === 'on' ? 'حُفظ كمسودة' : 'تم النشر' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveDeliveryPricing(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/admin/cities/${str(form, 'city')}/delivery-pricing`, {
      method: 'PUT',
      body: { baseFee: int(form, 'baseFee'), perKm: int(form, 'perKm'), minFee: int(form, 'minFee'), maxKm: Number(str(form, 'maxKm')), roundTo: int(form, 'roundTo') },
    });
    revalidatePath('/admin');
    return { ok: true, message: 'تم حفظ تسعير التوصيل — يُطبّق على الطلبات الجديدة فوراً' };
  } catch (err) {
    return toActionError(err);
  }
}
