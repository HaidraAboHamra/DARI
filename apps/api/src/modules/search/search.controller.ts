import { Controller, Get, Headers, Query } from '@nestjs/common';
import { type SearchQuery, searchQuerySchema, type SearchResponse } from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { OptionalUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { SearchService } from './search.service';

@Public()
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  run(
    @Query(zod(searchQuerySchema)) query: SearchQuery,
    @OptionalUser() viewer: AuthUser | null,
    @Headers('x-anonymous-id') anonymousId?: string,
  ): Promise<SearchResponse> {
    return this.search.search(query, viewer, anonymousId?.slice(0, 64));
  }
}
