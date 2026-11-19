'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';
import { currentUser } from '@/lib/session';

async function requireLogin(next: string): Promise<void> {
  if (!(await currentUser())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function applyToJob(jobId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireLogin(`/jobs/${jobId}`);
  try {
    await api(`/jobs/${jobId}/applications`, { method: 'POST', body: { message: str(form, 'message'), phone: str(form, 'phone') } });
    return { ok: true, message: 'تم إرسال طلبك، سيتواصل معك صاحب العمل' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function postJob(_: ActionState, form: FormData): Promise<ActionState> {
  await requireLogin('/jobs/new');
  let id: string;
  try {
    const job = await api<{ id: string }>('/jobs', {
      method: 'POST',
      body: {
        citySlug: config.city,
        title: str(form, 'title'),
        description: str(form, 'description'),
        employmentType: str(form, 'employmentType'),
        salaryMin: int(form, 'salaryMin'),
        salaryMax: int(form, 'salaryMax'),
        contactPhone: str(form, 'contactPhone'),
      },
    });
    id = job.id;
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/jobs/${id}`);
}

export async function reviewBusiness(businessId: string, slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireLogin(`/b/${slug}`);
  try {
    await api(`/businesses/${businessId}/reviews/mine`, {
      method: 'PUT',
      body: {
        rating: int(form, 'rating'),
        quality: int(form, 'quality'),
        commitment: int(form, 'commitment'),
        interaction: int(form, 'interaction'),
        body: str(form, 'body'),
      },
    });
    revalidatePath(`/b/${slug}`);
    return { ok: true, message: 'شكراً لتقييمك' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function requestDelivery(_: ActionState, form: FormData): Promise<ActionState> {
  await requireLogin('/delivery');
  try {
    await api('/deliveries', {
      method: 'POST',
      body: {
        citySlug: config.city,
        type: str(form, 'type'),
        itemDescription: str(form, 'itemDescription'),
        notes: str(form, 'notes'),
        pickup: { text: str(form, 'pickup'), contactPhone: str(form, 'pickupPhone') },
        dropoff: { text: str(form, 'dropoff'), contactPhone: str(form, 'dropoffPhone') },
      },
    });
    revalidatePath('/delivery');
    return { ok: true, message: 'تم إرسال الطلب، سيستلمه أقرب مندوب' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function cancelDelivery(id: string): Promise<void> {
  await api(`/deliveries/${id}/cancel`, { method: 'POST' });
  revalidatePath('/delivery');
}

export async function markNotificationsRead(): Promise<void> {
  await api('/me/notifications/read', { method: 'POST', body: { ids: [] } });
  revalidatePath('/account/notifications');
}
