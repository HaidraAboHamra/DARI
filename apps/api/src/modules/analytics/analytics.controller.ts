import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { type AnalyticsBatchInput, analyticsBatchSchema } from '@dari/contracts';
import { v7 as uuidv7 } from 'uuid';
import type { AuthUser } from '../../common/auth/auth-user';
import { OptionalUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { JobQueue } from '../../infrastructure/queue/queue.module';
import { CitiesService } from '../cities/cities.service';

const MAX_CLOCK_SKEW_MS = 5 * 60_000;
const MAX_EVENT_AGE_MS = 7 * 86_400_000;

/**
 * Event ingestion (blueprint §13.2). Accepts batches from clients and hands them
 * to the queue; the worker writes them in bulk into the partitioned table.
 */
@Public()
@Controller({ path: 'analytics/events', version: '1' })
export class AnalyticsController {
  constructor(
    private readonly queue: JobQueue,
    private readonly cities: CitiesService,
  ) {}

  @Post()
  @HttpCode(202)
  async ingest(@Body(zod(analyticsBatchSchema)) body: AnalyticsBatchInput, @OptionalUser() user: AuthUser | null) {
    const cityId = body.citySlug ? await this.cities.getBySlug(body.citySlug).then((c) => c.id).catch(() => null) : null;
    const now = Date.now();
    const receivedAt = new Date(now).toISOString();

    await this.queue.enqueueAnalytics({
      events: body.events.map((e) => {
        const occurred = e.occurredAt?.getTime() ?? now;
        const trusted = occurred <= now + MAX_CLOCK_SKEW_MS && occurred >= now - MAX_EVENT_AGE_MS;
        return {
          id: uuidv7(),
          name: e.name,
          cityId,
          userId: user?.id ?? null,
          anonymousId: body.anonymousId ?? null,
          entityType: e.entityType ?? null,
          entityId: e.entityId ?? null,
          searchId: e.searchId ?? null,
          props: e.props ?? null,
          occurredAt: new Date(trusted ? occurred : now).toISOString(),
          receivedAt,
        };
      }),
    });
    return { accepted: body.events.length };
  }
}
