import type { OpeningHours } from '@dari/contracts';

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Local weekday and minutes-since-midnight in the city's time zone. */
export function localClock(at: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: WEEKDAYS[get('weekday')] ?? 0, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

/**
 * Whether a business is open at `at`. Supports overnight shifts (e.g. 18:00–02:00),
 * which count for the day they started. Empty hours = unknown → treated as closed.
 */
export function isOpenAt(hours: OpeningHours, at: Date, timeZone: string): boolean {
  if (!hours.length) return false;
  const { day, minutes } = localClock(at, timeZone);
  const yesterday = (day + 6) % 7;
  return hours.some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    if (close > open) return slot.day === day && minutes >= open && minutes < close;
    // Overnight: open today until midnight, or started yesterday and still running.
    return (slot.day === day && minutes >= open) || (slot.day === yesterday && minutes < close);
  });
}
