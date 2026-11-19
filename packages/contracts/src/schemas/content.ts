import { z } from 'zod';
import { CONTENT_STATUSES, EMPLOYMENT_TYPES } from '../enums';
import { cursorQuerySchema, idSchema, moneySchema, phoneSchema, urlSchema } from './common';

export const createJobSchema = z
  .object({
    citySlug: z.string().trim().min(2).max(60),
    businessId: idSchema.optional(),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(5000),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    salaryMin: moneySchema.optional(),
    salaryMax: moneySchema.optional(),
    areaId: idSchema.optional(),
    contactPhone: phoneSchema.optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((j) => j.salaryMin === undefined || j.salaryMax === undefined || j.salaryMin <= j.salaryMax, {
    message: 'الحد الأدنى للراتب أكبر من الحد الأعلى',
    path: ['salaryMin'],
  });
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const listJobsQuerySchema = cursorQuerySchema.extend({
  city: z.string().trim().min(2).max(60),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
});
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

export const applyJobSchema = z.object({
  message: z.string().trim().max(2000).optional(),
  phone: phoneSchema.optional(),
});
export type ApplyJobInput = z.infer<typeof applyJobSchema>;

export const createArticleSchema = z.object({
  citySlug: z.string().trim().min(2).max(60),
  title: z.string().trim().min(5).max(200),
  summary: z.string().trim().min(10).max(400),
  body: z.string().trim().min(20).max(50_000),
  category: z.string().trim().max(60).optional(),
  coverUrl: urlSchema.optional(),
  status: z.enum(CONTENT_STATUSES).default('draft'),
});
export type CreateArticleInput = z.input<typeof createArticleSchema>;

export const listArticlesQuerySchema = cursorQuerySchema.extend({
  city: z.string().trim().min(2).max(60),
  category: z.string().trim().max(60).optional(),
});
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  quality: z.number().int().min(1).max(5).optional(),
  commitment: z.number().int().min(1).max(5).optional(),
  interaction: z.number().int().min(1).max(5).optional(),
  body: z.string().trim().max(1500).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
