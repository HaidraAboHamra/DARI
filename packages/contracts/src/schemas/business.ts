import { z } from 'zod';
import { BUSINESS_ROLES, VERTICALS } from '../enums';
import { cursorQuerySchema, geoPointSchema, idSchema, phoneSchema, urlSchema } from './common';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');

export const openingHoursSchema = z
  .array(
    z.object({
      day: z.number().int().min(0).max(6),
      open: time,
      close: time,
    }),
  )
  .max(21);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const createBusinessSchema = z.object({
  citySlug: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  vertical: z.enum(VERTICALS),
  categoryId: idSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  phone: phoneSchema.optional(),
  whatsapp: phoneSchema.optional(),
  address: z.string().trim().max(300).optional(),
  areaId: idSchema.optional(),
  location: geoPointSchema.optional(),
  openingHours: openingHoursSchema.optional(),
  acceptsOrders: z.boolean().optional(),
  deliveryFee: z.number().int().nonnegative().max(10_000_000).nullable().optional(),
  /** Typical preparation time (minutes) shown to customers as the ETA. */
  prepMinutes: z.number().int().min(5).max(240).optional(),
  minOrder: z.number().int().nonnegative().max(100_000_000).optional(),
  coverUrl: urlSchema.optional(),
  logoUrl: urlSchema.optional(),
});
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = createBusinessSchema.omit({ citySlug: true }).partial();
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const listBusinessesQuerySchema = cursorQuerySchema.extend({
  city: z.string().trim().min(2).max(60),
  vertical: z.enum(VERTICALS).optional(),
  categoryId: idSchema.optional(),
  areaId: idSchema.optional(),
  /** Customer location, for per-distance delivery fees. */
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;

export const addMemberSchema = z.object({
  phone: phoneSchema,
  role: z.enum(BUSINESS_ROLES).exclude(['owner']),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;
