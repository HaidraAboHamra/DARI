import { describe, expect, it } from 'vitest';
import { segmentOf } from './customer-segments';

const now = new Date('2026-11-19T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe('segmentOf', () => {
  it.each([
    [{ ordersCount: 12, lastOrderAt: daysAgo(2), createdAt: daysAgo(200) }, 'vip'],
    [{ ordersCount: 4, lastOrderAt: daysAgo(5), createdAt: daysAgo(90) }, 'loyal'],
    [{ ordersCount: 1, lastOrderAt: daysAgo(1), createdAt: daysAgo(1) }, 'new'],
    [{ ordersCount: 6, lastOrderAt: daysAgo(45), createdAt: daysAgo(300) }, 'at_risk'],
    [{ ordersCount: 20, lastOrderAt: daysAgo(90), createdAt: daysAgo(400) }, 'dormant'],
    [{ ordersCount: 2, lastOrderAt: daysAgo(10), createdAt: daysAgo(100) }, 'occasional'],
  ])('classifies %o as %s', (customer, expected) => {
    expect(segmentOf(customer, now)).toBe(expected);
  });
});
