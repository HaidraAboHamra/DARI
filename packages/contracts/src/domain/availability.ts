import type { OpeningHours } from '../schemas/business';
import { localDate, weekdayOf, zonedTimeToUtc } from './time-zone';

export interface Slot {
  startsAt: string;
  endsAt: string;
  /** Remaining capacity for this slot. */
  available: number;
}

export interface BookedInterval {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Generates bookable slots for one local date from weekly hours, subtracting
 * existing bookings (capacity-aware) and past times. Pure: the server and the
 * tests use the exact same rules.
 */
export function buildDaySlots(params: {
  date: string;
  timeZone: string;
  weeklyHours: OpeningHours;
  slotMinutes: number;
  capacity: number;
  booked: BookedInterval[];
  now?: Date;
}): Slot[] {
  const { date, timeZone, weeklyHours, slotMinutes, capacity, booked } = params;
  const now = params.now ?? new Date();
  const day = weekdayOf(date);
  const slots: Slot[] = [];

  for (const window of weeklyHours.filter((w) => w.day === day)) {
    const windowStart = zonedTimeToUtc(date, window.open, timeZone).getTime();
    let windowEnd = zonedTimeToUtc(date, window.close, timeZone).getTime();
    if (windowEnd <= windowStart) windowEnd += 86_400_000; // overnight window

    for (let start = windowStart; start + slotMinutes * 60_000 <= windowEnd; start += slotMinutes * 60_000) {
      const end = start + slotMinutes * 60_000;
      if (start <= now.getTime()) continue;
      const overlapping = booked.filter((b) => b.startsAt.getTime() < end && b.endsAt.getTime() > start).length;
      slots.push({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), available: Math.max(0, capacity - overlapping) });
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Whether a requested interval matches one of the generated slots exactly. */
export function isValidSlot(slots: Slot[], startsAt: Date): Slot | undefined {
  return slots.find((s) => new Date(s.startsAt).getTime() === startsAt.getTime());
}

export { localDate };
