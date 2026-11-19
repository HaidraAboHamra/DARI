import { Module } from '@nestjs/common';
import { CORE_MODULES } from '../app.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { DeliveryModule } from '../modules/delivery/delivery.module';
import { DirectoryModule } from '../modules/directory/directory.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { IngestionProcessors } from './ingestion.processors';
import { Maintenance } from './maintenance';
import { OutboxHandlers } from './outbox-handlers';
import { OutboxRelay } from './outbox-relay';

/** Background process: no HTTP, scaled independently from the API. */
@Module({
  imports: [...CORE_MODULES, DirectoryModule, CatalogModule, DeliveryModule, NotificationsModule],
  providers: [OutboxHandlers, OutboxRelay, IngestionProcessors, Maintenance],
})
export class WorkerModule {}
