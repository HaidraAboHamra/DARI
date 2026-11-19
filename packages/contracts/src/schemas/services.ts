import { z } from 'zod';
import { SERVICE_REQUEST_STATUSES, SERVICE_URGENCIES } from '../enums';
import { cursorQuerySchema, idSchema, moneySchema } from './common';

export const createServiceRequestSchema = z
  .object({
    citySlug: z.string().trim().min(2).max(60),
    categoryId: idSchema,
    /** Send to one provider directly instead of broadcasting to the category. */
    targetBusinessId: idSchema.optional(),
    description: z.string().trim().min(5).max(2000),
    address: z.string().trim().min(3).max(300),
    areaId: idSchema.optional(),
    urgency: z.enum(SERVICE_URGENCIES).default('today'),
    preferredAt: z.coerce.date().optional(),
  })
  .refine((r) => r.urgency !== 'scheduled' || r.preferredAt !== undefined, { message: 'حدد الموعد المفضل', path: ['preferredAt'] });
export type CreateServiceRequestInput = z.input<typeof createServiceRequestSchema>;

export const createQuoteSchema = z
  .object({
    businessId: idSchema,
    priceMin: moneySchema,
    priceMax: moneySchema,
    etaMinutes: z.number().int().min(5).max(7 * 24 * 60),
    message: z.string().trim().max(500).optional(),
  })
  .refine((q) => q.priceMin <= q.priceMax, { message: 'الحد الأدنى أكبر من الأعلى', path: ['priceMin'] });
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateServiceStatusSchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUSES),
  finalPrice: moneySchema.optional(),
});
export type UpdateServiceStatusInput = z.infer<typeof updateServiceStatusSchema>;

export const providerInboxQuerySchema = cursorQuerySchema.extend({ businessId: idSchema });
