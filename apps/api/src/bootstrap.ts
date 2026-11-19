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
import { httpDuration, httpErrors } from './modules/metrics/metrics';
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
  // Browser clients (the Expo web build) call the API directly; @fastify/cors only allows GET/HEAD/POST by default.
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization', 'idempotency-key'],
    maxAge: 600,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis: new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 500 }),
    nameSpace: 'rl:http:',
    skipOnError: true,
    allowList: (req) => req.url.startsWith('/health'),
  });

  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } });

  // RED metrics per route template (never raw URLs: bounded label cardinality).
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onResponse', async (req, reply) => {
    const route = req.routeOptions.url ?? 'unmatched';
    if (route === '/metrics') return;
    httpDuration.observe({ method: req.method, route, status: String(reply.statusCode) }, reply.elapsedTime / 1000);
    if (reply.statusCode >= 500) httpErrors.inc({ route });
  });

  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready', 'media/{*path}', 'metrics'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  return app;
}
