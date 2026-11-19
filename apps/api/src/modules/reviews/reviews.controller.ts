import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { type CreateReviewInput, createReviewSchema, type CursorQuery, cursorQuerySchema, type Page, type Review } from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { ReviewsService } from './reviews.service';

@Controller({ path: 'businesses/:id/reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @Query(zod(cursorQuerySchema)) q: CursorQuery): Promise<Page<Review>> {
    return this.reviews.list(id, q.cursor, q.limit);
  }

  @Put('mine')
  @HttpCode(204)
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(createReviewSchema)) body: CreateReviewInput,
  ): Promise<void> {
    return this.reviews.upsert(user, id, body);
  }
}
