import { Module } from '@nestjs/common';
import { PostgresSearchEngine } from './postgres-search.engine';
import { SearchController } from './search.controller';
import { SearchEngine } from './search-engine';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, { provide: SearchEngine, useClass: PostgresSearchEngine }],
  exports: [SearchService],
})
export class SearchModule {}
