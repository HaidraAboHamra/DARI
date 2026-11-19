import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './services.controller';
import { ServiceRequestsService } from './services.service';

@Module({ controllers: [ServiceRequestsController], providers: [ServiceRequestsService] })
export class ServiceRequestsModule {}
