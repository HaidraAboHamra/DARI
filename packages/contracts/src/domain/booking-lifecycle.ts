import type { BookingStatus } from '../enums';

export type BookingActor = 'customer' | 'merchant';

interface Rule {
  to: BookingStatus;
  by: readonly BookingActor[];
  /** Only allowed before (`before`) or after (`after`) the booking starts. */
  when?: 'before' | 'after';
}

const RULES: Readonly<Record<BookingStatus, readonly Rule[]>> = {
  pending: [
    { to: 'confirmed', by: ['merchant'], when: 'before' },
    { to: 'rejected', by: ['merchant'] },
    { to: 'cancelled', by: ['customer'], when: 'before' },
  ],
  confirmed: [
    { to: 'cancelled', by: ['customer'], when: 'before' },
    { to: 'cancelled', by: ['merchant'] },
    { to: 'completed', by: ['merchant'], when: 'after' },
    { to: 'no_show', by: ['merchant'], when: 'after' },
  ],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

/** Statuses that hold capacity on the calendar. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

export function nextBookingStatuses(from: BookingStatus, actor: BookingActor, startsAt: Date, now = new Date()): BookingStatus[] {
  const started = now >= startsAt;
  return RULES[from]
    .filter((r) => r.by.includes(actor) && (!r.when || (r.when === 'after') === started))
    .map((r) => r.to)
    .filter((s, i, all) => all.indexOf(s) === i);
}

export function canChangeBooking(from: BookingStatus, to: BookingStatus, actor: BookingActor, startsAt: Date, now = new Date()): boolean {
  return nextBookingStatuses(from, actor, startsAt, now).includes(to);
}
