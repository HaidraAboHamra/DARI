'use server';

import type { LeadStatus, PropertyListing } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';
import { currentUser } from '@/lib/session';

export async function requestViewing(listingId: string, _: ActionState, form: FormData): Promise<ActionState> {
  if (!(await currentUser())) redirect(`/login?next=/property/${listingId}`);
  try {
    await api(`/listings/${listingId}/viewings`, { method: 'POST', body: { message: str(form, 'message'), phone: str(form, 'phone'), preferredTime: str(form, 'preferredTime') } });
    return { ok: true, message: 'تم إرسال طلب المعاينة، سيتواصل معك المعلن' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createListing(_: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const images = form.getAll('images').filter((v): v is string => typeof v === 'string' && v.length > 0);
    const listing = await api<PropertyListing>('/listings', {
      method: 'POST',
      body: {
        citySlug: config.city,
        purpose: str(form, 'purpose'),
        propertyType: str(form, 'propertyType'),
        title: str(form, 'title'),
        description: str(form, 'description'),
        price: int(form, 'price'),
        areaId: str(form, 'areaId'),
        rooms: int(form, 'rooms'),
        sizeSqm: int(form, 'sizeSqm'),
        address: str(form, 'address'),
        images,
      },
    });
    id = listing.id;
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/property/${id}`);
}

export async function setListingStatus(id: string, status: 'active' | 'sold' | 'rented' | 'archived'): Promise<void> {
  await api(`/listings/${id}`, { method: 'PATCH', body: { status } });
  revalidatePath('/account/listings');
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await api(`/me/listings/leads/${id}`, { method: 'PATCH', body: { status } });
  revalidatePath('/account/listings');
}
