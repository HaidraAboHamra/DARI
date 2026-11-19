import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.url(),
    DATABASE_REPLICA_URL: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.url().optional()),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(500).default(20),
    REDIS_URL: z.url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
    OTP_DEV_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    LOG_PRETTY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.OTP_DEV_CODE === undefined, {
    message: 'OTP_DEV_CODE must not be set in production',
    path: ['OTP_DEV_CODE'],
  });

export type Env = z.infer<typeof envSchema>;

/** Validates the environment once at boot: a misconfigured instance must never start. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
