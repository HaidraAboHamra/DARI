import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';
import type { Env } from './config/env';

/** Builds the HTTP application. Shared by `main.ts` and the integration tests. */
export async function createApp(env: Env, options: { logger?: boolean } = {}): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 1_048_576,
    // Arabic slugs are ~6 bytes per letter once percent-encoded.
    maxParamLength: 512,
    genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => {
      const header = req.headers['x-request-id'];
      return typeof header === 'string' && header.length <= 100 ? header : randomUUID();
    },
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    logger: options.logger === false ? false : undefined,
  });
  if (options.logger !== false) app.useLogger(app.get(Logger));

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true, maxAge: 600 });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis: new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 500 }),
    nameSpace: 'rl:http:',
    skipOnError: true,
    allowList: (req) => req.url.startsWith('/health'),
  });

  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } });

  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready', 'media/{*path}'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  return app;
}
