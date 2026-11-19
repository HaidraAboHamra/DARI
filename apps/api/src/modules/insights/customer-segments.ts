export const CUSTOMER_SEGMENTS = ['vip', 'loyal', 'new', 'at_risk', 'dormant', 'occasional'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

const DAY_MS = 86_400_000;

/** Merchant CRM segmentation (blueprint §8.4): Loyal / New / At Risk / Dormant / VIP. */
export function segmentOf(c: { ordersCount: number; lastOrderAt: Date | null; createdAt: Date }, now = new Date()): CustomerSegment {
  const sinceLast = c.lastOrderAt ? (now.getTime() - c.lastOrderAt.getTime()) / DAY_MS : Infinity;
  if (sinceLast > 60) return 'dormant';
  if (sinceLast > 30) return 'at_risk';
  if (c.ordersCount >= 10) return 'vip';
  if (c.ordersCount >= 3) return 'loyal';
  if (c.ordersCount <= 1 && (now.getTime() - c.createdAt.getTime()) / DAY_MS <= 30) return 'new';
  return 'occasional';
}
