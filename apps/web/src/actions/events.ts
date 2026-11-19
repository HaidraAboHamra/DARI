'use server';

import type { CityEvent, Ticket } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';
import { currentUser } from '@/lib/session';

export async function buyTickets(eventId: string, _: ActionState, form: FormData): Promise<ActionState> {
  if (!(await currentUser())) redirect(`/login?next=/events/${eventId}`);
  try {
    await api<Ticket>(`/events/${eventId}/tickets`, { method: 'POST', body: { quantity: int(form, 'quantity') ?? 1 } });
  } catch (err) {
    return toActionError(err);
  }
  redirect('/tickets');
}

export async function cancelTicket(ticketId: string): Promise<void> {
  await api(`/me/tickets/${ticketId}/cancel`, { method: 'POST' });
  revalidatePath('/tickets');
}

export async function checkInTicket(eventId: string, code: string): Promise<ActionState & { holder?: string | null; quantity?: number }> {
  try {
    const t = await api<Ticket & { holderName: string | null }>(`/events/${eventId}/check-in`, { method: 'POST', body: { code } });
    revalidatePath(`/events/${eventId}/manage`);
    return { ok: true, holder: t.holderName, quantity: t.quantity };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createEvent(_: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const date = str(form, 'date');
    const time = str(form, 'time') ?? '18:00';
    const event = await api<CityEvent>('/events', {
      method: 'POST',
      body: {
        citySlug: config.city,
        kind: str(form, 'kind'),
        title: str(form, 'title'),
        description: str(form, 'description'),
        venue: str(form, 'venue'),
        destination: str(form, 'destination'),
        // Organizer enters Salamiyah local time (UTC+3).
        startsAt: date ? new Date(`${date}T${time}:00+03:00`).toISOString() : undefined,
        capacity: int(form, 'capacity'),
        price: int(form, 'price') ?? 0,
      },
    });
    id = event.id;
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/events/${id}/manage`);
}
