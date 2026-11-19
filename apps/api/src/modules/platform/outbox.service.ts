import { Injectable } from '@nestjs/common';
import type { DbExecutor } from '../../infrastructure/database/database.module';
import { outboxEvents } from '../../infrastructure/database/schema';
import type { DomainEvent } from './domain-events';

/** Records domain events inside the caller's transaction (transactional outbox). */
@Injectable()
export class OutboxService {
  async record(tx: DbExecutor, ...events: DomainEvent[]): Promise<void> {
    if (!events.length) return;
    await tx.insert(outboxEvents).values(
      events.map((e) => ({
        type: e.type,
        aggregateType: e.type.split('.')[0]!,
        aggregateId: e.aggregateId,
        payload: e.payload as Record<string, unknown>,
      })),
    );
  }
}
