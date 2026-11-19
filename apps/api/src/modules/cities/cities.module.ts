import { Global, Module } from '@nestjs/common';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Global()
@Module({
  controllers: [CitiesController],
  providers: [CitiesService, CacheService],
  exports: [CitiesService, CacheService],
})
export class CitiesModule {}
