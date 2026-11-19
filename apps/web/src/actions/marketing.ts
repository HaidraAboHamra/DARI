'use server';

import type { FavoriteType } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { currentUser } from '@/lib/session';

async function requireLogin(next: string) {
  if (!(await currentUser())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function toggleFavorite(entityType: FavoriteType, entityId: string, favorite: boolean, path: string): Promise<boolean> {
  await requireLogin(path);
  await api('/me/favorites', { method: favorite ? 'PUT' : 'DELETE', body: { entityType, entityId } });
  revalidatePath('/account/favorites');
  return favorite;
}

export async function connectBusiness(businessId: string, path: string): Promise<void> {
  await requireLogin(path);
  await api(`/businesses/${businessId}/connect`, { method: 'POST' });
  revalidatePath(path);
}

export async function disconnectBusiness(businessId: string): Promise<void> {
  await api(`/businesses/${businessId}/connect`, { method: 'DELETE' });
  revalidatePath('/account/favorites');
}

export async function previewCoupon(businessId: string, code: string, subtotal: number): Promise<{ discount?: number; title?: string; error?: string }> {
  if (!(await currentUser())) return { error: 'سجّل الدخول لاستخدام الكوبونات' };
  try {
    return await api('/coupons/preview', { method: 'POST', body: { businessId, code, subtotal } });
  } catch (err) {
    return { error: toActionError(err).error ?? 'الكوبون غير صالح' };
  }
}

export async function createCoupon(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const days = int(form, 'days');
    await api(`/merchant/businesses/${businessId}/coupons`, {
      method: 'POST',
      body: {
        code: str(form, 'code'),
        title: str(form, 'title'),
        kind: str(form, 'kind'),
        value: int(form, 'value'),
        minOrder: int(form, 'minOrder') ?? 0,
        maxUses: int(form, 'maxUses') ?? null,
        endsAt: days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined,
      },
    });
    revalidatePath(`/merchant/${businessId}/marketing`);
    return { ok: true, message: 'تم إنشاء الكوبون' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleCoupon(businessId: string, couponId: string, isActive: boolean): Promise<void> {
  await api(`/merchant/businesses/${businessId}/coupons/${couponId}`, { method: 'PATCH', body: { isActive } });
  revalidatePath(`/merchant/${businessId}/marketing`);
}

export async function sendBroadcast(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const res = await api<{ audience: number }>(`/merchant/businesses/${businessId}/broadcasts`, { method: 'POST', body: { title: str(form, 'title'), body: str(form, 'body') } });
    revalidatePath(`/merchant/${businessId}/marketing`);
    return { ok: true, message: `أُرسلت إلى ${res.audience} زبون` };
  } catch (err) {
    return toActionError(err);
  }
}
