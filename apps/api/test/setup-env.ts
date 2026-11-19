// Runs before any module is imported: points the app at isolated test resources.
process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/dari_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-0123456789';
process.env.OTP_DEV_CODE = '123456';
process.env.CORS_ORIGINS = 'http://localhost:3000';
