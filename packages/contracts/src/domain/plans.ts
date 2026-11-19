import type { PlanId } from '../enums';

export interface PlanLimits {
  readonly id: PlanId;
  readonly nameAr: string;
  /** Monthly price in SYP. Prices are configuration, validated in the field (financial doc §8). */
  readonly monthlyPrice: number;
  readonly maxProducts: number;
  readonly maxMembers: number;
  readonly maxResources: number;
  readonly coupons: boolean;
  readonly broadcasts: boolean;
  readonly advancedInsights: boolean;
}

/**
 * Free → paid ladder (financial doc §6, §8.2): the free tier is genuinely useful,
 * each paid tier unlocks operational value, never basic visibility.
 */
export const PLANS: Readonly<Record<PlanId, PlanLimits>> = {
  free: { id: 'free', nameAr: 'مجاني', monthlyPrice: 0, maxProducts: 30, maxMembers: 2, maxResources: 1, coupons: false, broadcasts: false, advancedInsights: false },
  starter: { id: 'starter', nameAr: 'أساسي', monthlyPrice: 75_000, maxProducts: 150, maxMembers: 4, maxResources: 3, coupons: true, broadcasts: false, advancedInsights: false },
  business: { id: 'business', nameAr: 'أعمال', monthlyPrice: 150_000, maxProducts: 1_000, maxMembers: 10, maxResources: 10, coupons: true, broadcasts: true, advancedInsights: true },
  pro: { id: 'pro', nameAr: 'احترافي', monthlyPrice: 300_000, maxProducts: 10_000, maxMembers: 50, maxResources: 50, coupons: true, broadcasts: true, advancedInsights: true },
};

/** The plan in force: a paid plan falls back to free once it expires. */
export function effectivePlan(plan: PlanId, expiresAt: Date | string | null, now = new Date()): PlanLimits {
  if (plan === 'free') return PLANS.free;
  if (!expiresAt || new Date(expiresAt) <= now) return PLANS.free;
  return PLANS[plan];
}
