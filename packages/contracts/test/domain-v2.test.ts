import { describe, expect, it } from 'vitest';
import { buildDaySlots } from '../src/domain/availability';
import { couponDiscount } from '../src/domain/coupons';
import { effectivePlan, PLANS } from '../src/domain/plans';
import { addDays, localDate, weekdayOf, zonedTimeToUtc } from '../src/domain/time-zone';

const TZ = 'Asia/Damascus';

describe('time zone helpers', () => {
  it('converts Damascus wall time to UTC', () => {
    expect(zonedTimeToUtc('2026-11-20', '16:30', TZ).toISOString()).toBe('2026-11-20T13:30:00.000Z');
  });
  it('computes weekdays and adds days across months', () => {
    expect(weekdayOf('2026-11-20')).toBe(5); // Friday
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(localDate(new Date('2026-11-19T22:30:00Z'), TZ)).toBe('2026-11-20');
  });
});

describe('buildDaySlots', () => {
  const base = {
    date: '2026-11-20',
    timeZone: TZ,
    weeklyHours: [{ day: 5, open: '16:00', close: '19:00' }],
    slotMinutes: 60,
    capacity: 2,
    now: new Date('2026-11-20T00:00:00Z'),
  };

  it('generates slots inside the weekly window', () => {
    const slots = buildDaySlots({ ...base, booked: [] });
    expect(slots.map((s) => s.startsAt)).toEqual(['2026-11-20T13:00:00.000Z', '2026-11-20T14:00:00.000Z', '2026-11-20T15:00:00.000Z']);
    expect(slots.every((s) => s.available === 2)).toBe(true);
  });

  it('subtracts overlapping bookings per slot (capacity aware)', () => {
    const booked = [
      { startsAt: new Date('2026-11-20T13:00:00Z'), endsAt: new Date('2026-11-20T14:00:00Z') },
      { startsAt: new Date('2026-11-20T13:00:00Z'), endsAt: new Date('2026-11-20T14:00:00Z') },
      { startsAt: new Date('2026-11-20T14:30:00Z'), endsAt: new Date('2026-11-20T15:30:00Z') },
    ];
    const slots = buildDaySlots({ ...base, booked });
    expect(slots.map((s) => s.available)).toEqual([0, 1, 1]);
  });

  it('hides past slots and closed days', () => {
    expect(buildDaySlots({ ...base, booked: [], now: new Date('2026-11-20T14:30:00Z') })).toHaveLength(1);
    expect(buildDaySlots({ ...base, date: '2026-11-21', booked: [] })).toEqual([]);
  });
});

describe('couponDiscount', () => {
  it('applies percent with cap and minimum order', () => {
    const rule = { kind: 'percent' as const, value: 20, minOrder: 50_000, maxDiscount: 15_000 };
    expect(couponDiscount(rule, 40_000)).toBe(0);
    expect(couponDiscount(rule, 50_000)).toBe(10_000);
    expect(couponDiscount(rule, 200_000)).toBe(15_000);
  });
  it('never exceeds the subtotal', () => {
    expect(couponDiscount({ kind: 'amount', value: 30_000, minOrder: 0, maxDiscount: null }, 20_000)).toBe(20_000);
  });
});

describe('effectivePlan', () => {
  const now = new Date('2026-11-19T00:00:00Z');
  it('falls back to free when a paid plan expires', () => {
    expect(effectivePlan('business', '2026-12-01T00:00:00Z', now)).toBe(PLANS.business);
    expect(effectivePlan('business', '2026-11-01T00:00:00Z', now)).toBe(PLANS.free);
    expect(effectivePlan('pro', null, now)).toBe(PLANS.free);
  });
});

import { nextBookingStatuses } from '../src/domain/booking-lifecycle';

describe('booking lifecycle', () => {
  const start = new Date('2026-11-20T13:00:00Z');
  const before = new Date('2026-11-20T10:00:00Z');
  const after = new Date('2026-11-20T14:00:00Z');
  it('lets customers cancel only before the start', () => {
    expect(nextBookingStatuses('confirmed', 'customer', start, before)).toEqual(['cancelled']);
    expect(nextBookingStatuses('confirmed', 'customer', start, after)).toEqual([]);
  });
  it('lets merchants complete or mark no-show only after the start', () => {
    expect(nextBookingStatuses('confirmed', 'merchant', start, before)).toEqual(['cancelled']);
    expect(nextBookingStatuses('confirmed', 'merchant', start, after)).toEqual(['cancelled', 'completed', 'no_show']);
    expect(nextBookingStatuses('pending', 'merchant', start, before)).toEqual(['confirmed', 'rejected']);
  });
});
