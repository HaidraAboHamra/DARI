import { z } from 'zod';
import { moneySchema, urlSchema } from './common';

const optionIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, 'معرّف خيار غير صالح');

/** One customization group on a product, e.g. «الحجم» (pick 1) or «إضافات» (pick up to 3). */
export const productOptionGroupSchema = z
  .object({
    id: optionIdSchema,
    name: z.string().trim().min(1).max(60),
    /** Choices the customer must pick (0 = optional). */
    min: z.number().int().min(0).max(10),
    max: z.number().int().min(1).max(20),
    choices: z
      .array(z.object({ id: optionIdSchema, name: z.string().trim().min(1).max(60), price: moneySchema.default(0) }))
      .min(1)
      .max(30),
  })
  .refine((g) => g.min <= g.max && g.max <= g.choices.length, { message: 'حدود الاختيار غير منطقية', path: ['max'] });
export type ProductOptionGroupInput = z.input<typeof productOptionGroupSchema>;

export const productOptionsSchema = z
  .array(productOptionGroupSchema)
  .max(10)
  .refine((groups) => {
    const ids = groups.flatMap((g) => [g.id, ...g.choices.map((c) => c.id)]);
    return new Set(ids).size === ids.length;
  }, 'معرّفات الخيارات يجب أن تكون فريدة');

/** Product fields without defaults: the base for both create and (partial) update. */
const productFields = {
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  section: z.string().trim().max(80).optional(),
  price: moneySchema,
  imageUrl: urlSchema.optional(),
  isAvailable: z.boolean(),
  /** `null` means stock is not tracked for this product. */
  stock: z.number().int().min(0).max(1_000_000).nullable(),
  sortOrder: z.number().int().min(0).max(10_000),
  options: productOptionsSchema,
  /** Pinned by the merchant into «الأكثر طلباً». */
  isFeatured: z.boolean(),
};

export const createProductSchema = z.object({
  ...productFields,
  isAvailable: productFields.isAvailable.default(true),
  stock: productFields.stock.default(null),
  sortOrder: productFields.sortOrder.default(0),
  options: productFields.options.default([]),
  isFeatured: productFields.isFeatured.default(false),
});
export type CreateProductInput = z.input<typeof createProductSchema>;

/** PATCH semantics: only fields that are sent change (no defaults are applied). */
export const updateProductSchema = z.object(productFields).partial();
export type UpdateProductInput = z.input<typeof updateProductSchema>;
