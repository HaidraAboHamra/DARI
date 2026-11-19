import { z } from 'zod';
import { DELIVERY_STATUSES, DELIVERY_TASK_TYPES } from '../enums';
import { placeSchema } from './common';

export const createDeliverySchema = z.object({
  citySlug: z.string().trim().min(2).max(60),
  type: z.enum(DELIVERY_TASK_TYPES).exclude(['merchant_to_citizen']),
  pickup: placeSchema,
  dropoff: placeSchema,
  itemDescription: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(500).optional(),
  scheduledFor: z.coerce.date().optional(),
});
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
});
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
