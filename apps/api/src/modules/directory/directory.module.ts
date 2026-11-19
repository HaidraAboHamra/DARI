import { Global, Module } from '@nestjs/common';
import { BusinessAccessService } from './business-access.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesRepository } from './businesses.repository';
import { BusinessesService } from './businesses.service';
import { PlansService } from './plans.service';

@Global()
@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessesRepository, BusinessAccessService, PlansService],
  exports: [BusinessesService, BusinessesRepository, BusinessAccessService, PlansService],
})
export class DirectoryModule {}
