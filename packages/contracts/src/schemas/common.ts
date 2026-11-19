import { z } from 'zod';

export const idSchema = z.uuid();

export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

const SYRIAN_LOCAL = /^0?9\d{8}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Accepts local Syrian mobile formats (09XXXXXXXX / 9XXXXXXXX), 00-prefixed and
 * E.164 numbers, and always outputs E.164 so a phone has exactly one stored form.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s\-()]/g, '').replace(/^00/, '+'))
  .transform((p) => (SYRIAN_LOCAL.test(p) ? `+963${p.replace(/^0/, '')}` : p))
  .transform((p) => (/^963\d{9}$/.test(p) ? `+${p}` : p))
  .refine((p) => E164.test(p), { message: 'رقم الهاتف غير صالح' });

/** Amounts are integers in the city's currency minor-less unit (e.g. SYP). */
export const moneySchema = z.number().int().nonnegative().max(1_000_000_000_000);

export const placeSchema = z.object({
  text: z.string().trim().min(3).max(300),
  areaId: idSchema.optional(),
  location: geoPointSchema.optional(),
  contactPhone: phoneSchema.optional(),
});
export type Place = z.infer<typeof placeSchema>;

export const urlSchema = z.url({ protocol: /^https?$/ }).max(500);
