'use server';

import type { ServiceRequest, ServiceRequestStatus } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';

export async function createServiceRequest(_: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const request = await api<ServiceRequest>('/service-requests', {
      method: 'POST',
      body: {
        citySlug: config.city,
        categoryId: str(form, 'categoryId'),
        targetBusinessId: str(form, 'targetBusinessId'),
        areaId: str(form, 'areaId'),
        description: str(form, 'description'),
        address: str(form, 'address'),
        urgency: str(form, 'urgency'),
        preferredAt: str(form, 'preferredAt'),
      },
    });
    id = request.id;
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/services/${id}`);
}

export async function acceptQuote(requestId: string, quoteId: string): Promise<ActionState> {
  try {
    await api(`/service-requests/${requestId}/quotes/${quoteId}/accept`, { method: 'POST' });
    revalidatePath(`/services/${requestId}`);
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setServiceStatus(requestId: string, status: ServiceRequestStatus, path: string, finalPrice?: number): Promise<ActionState> {
  try {
    await api(`/service-requests/${requestId}/status`, { method: 'PATCH', body: { status, finalPrice } });
    revalidatePath(path);
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function sendQuote(requestId: string, businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/service-requests/${requestId}/quotes`, {
      method: 'POST',
      body: { businessId, priceMin: int(form, 'priceMin'), priceMax: int(form, 'priceMax'), etaMinutes: int(form, 'etaMinutes'), message: str(form, 'message') },
    });
    revalidatePath(`/merchant/${businessId}/requests`);
    return { ok: true, message: 'تم إرسال العرض' };
  } catch (err) {
    return toActionError(err);
  }
}
