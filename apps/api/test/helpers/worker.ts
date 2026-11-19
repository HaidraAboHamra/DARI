import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DB, type Database } from '../../src/infrastructure/database/database.module';
import { DeliveryService } from '../../src/modules/delivery/delivery.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { OutboxHandlers } from '../../src/worker/outbox-handlers';
import { OutboxRelay } from '../../src/worker/outbox-relay';

/** The real outbox relay + handlers, driven manually instead of by a polling loop. */
export function outboxRelay(app: NestFastifyApplication): OutboxRelay {
  const db = app.get<Database>(DB);
  const handlers = new OutboxHandlers(db, app.get(NotificationsService), app.get(DeliveryService));
  return new OutboxRelay(db, handlers);
}
