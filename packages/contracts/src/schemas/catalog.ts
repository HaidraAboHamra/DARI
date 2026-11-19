import { z } from 'zod';
import { moneySchema, urlSchema } from './common';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  section: z.string().trim().max(80).optional(),
  price: moneySchema,
  imageUrl: urlSchema.optional(),
  isAvailable: z.boolean().default(true),
  /** `null` means stock is not tracked for this product. */
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type CreateProductInput = z.input<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.input<typeof updateProductSchema>;
