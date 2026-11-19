import { Module, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { HttpErrorFilter } from './common/errors/http-error.filter';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { DatabaseModule } from './infrastructure/database/database.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { InsightsModule } from './modules/insights/insights.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MediaModule } from './modules/media/media.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { NewsModule } from './modules/news/news.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PropertyModule } from './modules/property/property.module';
import { RealtimeApiModule } from './modules/realtime/realtime-api.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SearchModule } from './modules/search/search.module';
import { ServiceRequestsModule } from './modules/services/services.module';
import { CitiesModule } from './modules/cities/cities.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformModule } from './modules/platform/platform.module';
import { UsersModule } from './modules/users/users.module';

const env = loadEnv();

/** Infrastructure shared by the HTTP app and the worker. */
export const CORE_MODULES = [
  ConfigModule,
  LoggerModule.forRoot({
    forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
    pinoHttp: {
      level: env.LOG_LEVEL,
      genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
      ...(env.LOG_PRETTY && { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
    },
  }),
  DatabaseModule,
  RedisModule,
  RealtimeModule,
  QueueModule,
  PlatformModule,
  CitiesModule,
  UsersModule,
];

/**
 * Modular monolith: each module owns its tables and exposes services.
 * Modules can be extracted into separate services later along these seams.
 */
@Module({
  imports: [
    ...CORE_MODULES,
    HealthModule,
    AuthModule,
    DirectoryModule,
    CatalogModule,
    OrdersModule,
    DeliveryModule,
    JobsModule,
    NewsModule,
    ReviewsModule,
    SearchModule,
    AnalyticsModule,
    InsightsModule,
    NotificationsModule,
    BookingsModule,
    ServiceRequestsModule,
    EventsModule,
    PropertyModule,
    MediaModule,
    MarketingModule,
    AdminModule,
    RealtimeApiModule,
    AssistantModule,
    MetricsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
