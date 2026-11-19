import type { CouponKind } from '../enums';

export interface CouponRule {
  kind: CouponKind;
  value: number;
  minOrder: number;
  /** Optional cap for percent coupons, in currency units. */
  maxDiscount: number | null;
}

/** Discount for a subtotal. Never negative, never above the subtotal. */
export function couponDiscount(rule: CouponRule, subtotal: number): number {
  if (subtotal < rule.minOrder) return 0;
  const raw = rule.kind === 'percent' ? Math.floor((subtotal * Math.min(rule.value, 100)) / 100) : rule.value;
  const capped = rule.maxDiscount !== null ? Math.min(raw, rule.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}
