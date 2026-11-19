import { describe, expect, it } from 'vitest';
import { isOpenAt, localClock } from '../src/domain/opening-hours';

const TZ = 'Asia/Damascus'; // UTC+3
// 2026-11-19 is a Thursday (day 4).
const at = (utcHour: number, utcMinute = 0) => new Date(Date.UTC(2026, 10, 19, utcHour, utcMinute));

describe('opening hours', () => {
  it('converts to the city clock', () => {
    expect(localClock(at(9, 30), TZ)).toEqual({ day: 4, minutes: 12 * 60 + 30 });
  });

  it('handles a regular day shift', () => {
    const hours = [{ day: 4, open: '09:00', close: '17:00' }];
    expect(isOpenAt(hours, at(6), TZ)).toBe(true); // 09:00 local
    expect(isOpenAt(hours, at(14), TZ)).toBe(false); // 17:00 local, closed
  });

  it('handles overnight shifts across midnight', () => {
    const hours = [{ day: 3, open: '18:00', close: '02:00' }]; // Wed night
    expect(isOpenAt(hours, at(22, 30), TZ)).toBe(false); // Fri 01:30 local, Thu had no shift
    expect(isOpenAt(hours, new Date(Date.UTC(2026, 10, 18, 22, 30)), TZ)).toBe(true); // Thu 01:30 local
  });

  it('treats missing hours as closed', () => {
    expect(isOpenAt([], at(9), TZ)).toBe(false);
  });
});
