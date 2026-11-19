import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

/** Depends on Orders (one direction). Orders reaches Delivery only via outbox events. */
@Module({ imports: [OrdersModule], controllers: [DeliveryController], providers: [DeliveryService], exports: [DeliveryService] })
export class DeliveryModule {}
