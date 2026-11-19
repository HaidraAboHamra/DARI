import { z } from 'zod';
import { FULFILLMENT_TYPES, ORDER_STATUSES } from '../enums';
import { cursorQuerySchema, idSchema, placeSchema } from './common';

export const createOrderSchema = z
  .object({
    businessId: idSchema,
    items: z
      .array(z.object({ productId: idSchema, quantity: z.number().int().min(1).max(99) }))
      .min(1)
      .max(50),
    fulfillment: z.enum(FULFILLMENT_TYPES),
    address: placeSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    couponCode: z.string().trim().toUpperCase().max(20).optional(),
  })
  .refine((o) => o.fulfillment === 'pickup' || o.address !== undefined, {
    message: 'عنوان التوصيل مطلوب',
    path: ['address'],
  })
  .refine((o) => new Set(o.items.map((i) => i.productId)).size === o.items.length, {
    message: 'منتج مكرر في الطلب',
    path: ['items'],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(300).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = cursorQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
