'use server';

import type { BookableResource, Booking, BookingStatus, CreateResourceInput, Slot } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { currentUser } from '@/lib/session';

export async function getSlots(resourceId: string, date: string): Promise<Slot[]> {
  const res = await api<{ slots: Slot[] }>(`/resources/${resourceId}/slots`, { query: { date } });
  return res.slots;
}

export async function quoteNights(resourceId: string, checkIn: string, checkOut: string): Promise<{ nights: number; available: number; total: number } | { error: string }> {
  try {
    return await api(`/resources/${resourceId}/nights`, { query: { checkIn, checkOut } });
  } catch (err) {
    return { error: toActionError(err).error ?? 'تعذر التحقق من التوفر' };
  }
}

export async function createBooking(input: {
  resourceId: string;
  startsAt?: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}): Promise<{ booking?: Booking; error?: string; needsLogin?: boolean }> {
  if (!(await currentUser())) return { needsLogin: true };
  try {
    return { booking: await api<Booking>('/bookings', { method: 'POST', body: input }) };
  } catch (err) {
    return { error: toActionError(err).error ?? 'تعذر الحجز' };
  }
}

export async function changeBookingStatus(id: string, status: BookingStatus, path: string): Promise<ActionState> {
  try {
    await api(`/bookings/${id}/status`, { method: 'PATCH', body: { status } });
    revalidatePath(path);
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function createResource(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const unit = str(form, 'unit') as CreateResourceInput['unit'];
  const days = DAYS.filter((d) => form.get(`day${d}`) === 'on');
  const open = str(form, 'open') ?? '09:00';
  const close = str(form, 'close') ?? '17:00';
  try {
    await api<BookableResource>(`/merchant/businesses/${businessId}/resources`, {
      method: 'POST',
      body: {
        name: str(form, 'name'),
        kind: str(form, 'kind'),
        unit,
        slotMinutes: int(form, 'slotMinutes') ?? 60,
        capacity: int(form, 'capacity') ?? 1,
        price: int(form, 'price') ?? 0,
        autoConfirm: form.get('autoConfirm') === 'on',
        weeklyHours: unit === 'slot' ? days.map((day) => ({ day, open, close })) : [],
      },
    });
    revalidatePath(`/merchant/${businessId}/bookings`);
    return { ok: true, message: 'تمت إضافة المورد' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleResource(businessId: string, resourceId: string, isActive: boolean): Promise<void> {
  await api(`/merchant/businesses/${businessId}/resources/${resourceId}`, { method: 'PATCH', body: { isActive } });
  revalidatePath(`/merchant/${businessId}/bookings`);
}
