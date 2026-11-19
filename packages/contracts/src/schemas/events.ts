import { z } from 'zod';
import { CONTENT_STATUSES, EVENT_KINDS } from '../enums';
import { cursorQuerySchema, idSchema, moneySchema, urlSchema } from './common';

export const createEventSchema = z
  .object({
    citySlug: z.string().trim().min(2).max(60),
    businessId: idSchema.optional(),
    kind: z.enum(EVENT_KINDS),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(5000),
    venue: z.string().trim().min(2).max(200),
    destination: z.string().trim().max(200).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    capacity: z.number().int().min(1).max(100_000),
    price: moneySchema.default(0),
    coverUrl: urlSchema.optional(),
    status: z.enum(CONTENT_STATUSES).default('published'),
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, { message: 'وقت الانتهاء قبل البداية', path: ['endsAt'] });
export type CreateEventInput = z.input<typeof createEventSchema>;

export const listEventsQuerySchema = cursorQuerySchema.extend({
  city: z.string().trim().min(2).max(60),
  kind: z.enum(EVENT_KINDS).optional(),
});
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const buyTicketsSchema = z.object({ quantity: z.number().int().min(1).max(20) });
export type BuyTicketsInput = z.infer<typeof buyTicketsSchema>;

export const checkInSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^T-[0-9A-Z]{8}$/) });
export type CheckInInput = z.infer<typeof checkInSchema>;
