import { z } from 'zod';
import { BOOKING_STATUSES, BOOKING_UNITS, RESOURCE_KINDS } from '../enums';
import { cursorQuerySchema, idSchema, moneySchema } from './common';
import { openingHoursSchema } from './business';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const createResourceSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional(),
    kind: z.enum(RESOURCE_KINDS),
    unit: z.enum(BOOKING_UNITS),
    slotMinutes: z.number().int().min(10).max(24 * 60).default(60),
    capacity: z.number().int().min(1).max(500).default(1),
    price: moneySchema.default(0),
    weeklyHours: openingHoursSchema.default([]),
    autoConfirm: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .refine((r) => r.unit === 'night' || r.weeklyHours.length > 0, {
    message: 'حدد أوقات التوفر للحجز بالساعة',
    path: ['weeklyHours'],
  });
export type CreateResourceInput = z.input<typeof createResourceSchema>;

export const updateResourceSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  slotMinutes: z.number().int().min(10).max(24 * 60).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  price: moneySchema.optional(),
  weeklyHours: openingHoursSchema.optional(),
  autoConfirm: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const availabilityQuerySchema = z.object({ date: isoDate });

export const createBookingSchema = z
  .object({
    resourceId: idSchema,
    /** Slot bookings: exact slot start. */
    startsAt: z.coerce.date().optional(),
    /** Night bookings: check-in / check-out local dates. */
    checkIn: isoDate.optional(),
    checkOut: isoDate.optional(),
    partySize: z.number().int().min(1).max(500).default(1),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.startsAt !== undefined || (b.checkIn !== undefined && b.checkOut !== undefined), {
    message: 'حدد الموعد أو تاريخي الوصول والمغادرة',
    path: ['startsAt'],
  });
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({ status: z.enum(BOOKING_STATUSES), reason: z.string().trim().max(300).optional() });
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

export const listBookingsQuerySchema = cursorQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  from: isoDate.optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
