import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { MarketingModule } from '../marketing/marketing.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [CatalogModule, MarketingModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
