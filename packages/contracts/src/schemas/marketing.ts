import { z } from 'zod';
import { COUPON_KINDS, FAVORITE_TYPES, PAYMENT_METHODS, PLAN_IDS, PLATFORM_ROLES } from '../enums';
import { idSchema, moneySchema } from './common';

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, 'أحرف لاتينية وأرقام فقط'),
    title: z.string().trim().min(2).max(120),
    kind: z.enum(COUPON_KINDS),
    value: z.number().int().positive(),
    minOrder: moneySchema.default(0),
    maxDiscount: moneySchema.nullable().default(null),
    maxUses: z.number().int().positive().nullable().default(null),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isPublic: z.boolean().default(true),
  })
  .refine((c) => c.kind !== 'percent' || c.value <= 90, { message: 'الخصم لا يتجاوز 90٪', path: ['value'] });
export type CreateCouponInput = z.input<typeof createCouponSchema>;

export const validateCouponSchema = z.object({ businessId: idSchema, code: z.string().trim().toUpperCase().max(20), subtotal: moneySchema });

export const createBroadcastSchema = z.object({
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(5).max(400),
});
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

export const favoriteSchema = z.object({ entityType: z.enum(FAVORITE_TYPES), entityId: idSchema });
export type FavoriteInput = z.infer<typeof favoriteSchema>;

export const setRoleSchema = z.object({ role: z.enum(PLATFORM_ROLES) });

export const recordPaymentSchema = z.object({
  plan: z.enum(PLAN_IDS).exclude(['free']),
  months: z.number().int().min(1).max(24),
  amount: moneySchema,
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const featureSchema = z.object({ days: z.number().int().min(0).max(365) });
