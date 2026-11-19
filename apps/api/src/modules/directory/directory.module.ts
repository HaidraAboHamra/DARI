import { Global, Module } from '@nestjs/common';
import { BusinessAccessService } from './business-access.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesRepository } from './businesses.repository';
import { BusinessesService } from './businesses.service';

@Global()
@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessesRepository, BusinessAccessService],
  exports: [BusinessesService, BusinessesRepository, BusinessAccessService],
})
export class DirectoryModule {}
