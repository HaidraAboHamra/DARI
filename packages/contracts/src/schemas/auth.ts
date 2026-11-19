import { z } from 'zod';
import { phoneSchema } from './common';

export const requestOtpSchema = z.object({ phone: phoneSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'الرمز يجب أن يكون 6 أرقام'),
  deviceName: z.string().trim().max(100).optional(),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(20).max(500) });
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  citySlug: z.string().trim().max(60).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
