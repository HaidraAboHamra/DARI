import { z } from 'zod';
import { ANALYTICS_EVENTS, ENTITY_TYPES, VERTICALS } from '../enums';
import { idSchema } from './common';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  city: z.string().trim().min(2).max(60),
  vertical: z.enum(VERTICALS).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const analyticsBatchSchema = z.object({
  anonymousId: z.string().trim().min(8).max(64).optional(),
  citySlug: z.string().trim().max(60).optional(),
  events: z
    .array(
      z.object({
        name: z.enum(ANALYTICS_EVENTS),
        entityType: z.enum(ENTITY_TYPES).optional(),
        entityId: idSchema.optional(),
        searchId: idSchema.optional(),
        props: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
        occurredAt: z.coerce.date().optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type AnalyticsBatchInput = z.infer<typeof analyticsBatchSchema>;
