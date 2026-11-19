import { z } from 'zod';
import { LEAD_STATUSES, LISTING_PURPOSES, LISTING_STATUSES, PROPERTY_TYPES } from '../enums';
import { cursorQuerySchema, geoPointSchema, idSchema, moneySchema, phoneSchema, urlSchema } from './common';

export const createListingSchema = z.object({
  citySlug: z.string().trim().min(2).max(60),
  businessId: idSchema.optional(),
  purpose: z.enum(LISTING_PURPOSES),
  propertyType: z.enum(PROPERTY_TYPES),
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(5000),
  price: moneySchema,
  areaId: idSchema.optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  sizeSqm: z.number().int().min(1).max(10_000_000).optional(),
  address: z.string().trim().max(300).optional(),
  location: geoPointSchema.optional(),
  images: z.array(urlSchema).max(12).default([]),
});
export type CreateListingInput = z.input<typeof createListingSchema>;

export const updateListingSchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  price: moneySchema.optional(),
  status: z.enum(LISTING_STATUSES).optional(),
  images: z.array(urlSchema).max(12).optional(),
});
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listListingsQuerySchema = cursorQuerySchema.extend({
  city: z.string().trim().min(2).max(60),
  purpose: z.enum(LISTING_PURPOSES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  areaId: idSchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRooms: z.coerce.number().int().nonnegative().optional(),
});
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;

export const viewingRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
  phone: phoneSchema.optional(),
  preferredTime: z.string().trim().max(100).optional(),
});
export type ViewingRequestInput = z.infer<typeof viewingRequestSchema>;

export const updateLeadSchema = z.object({ status: z.enum(LEAD_STATUSES) });
