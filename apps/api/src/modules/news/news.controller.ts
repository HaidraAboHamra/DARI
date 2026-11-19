import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type Article,
  CONTENT_STATUSES,
  type CreateArticleInput,
  createArticleSchema,
  type ListArticlesQuery,
  listArticlesQuerySchema,
  type Page,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { NewsService } from './news.service';

const statusBody = z.object({ status: z.enum(CONTENT_STATUSES) });

@Controller({ path: 'news', version: '1' })
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Public()
  @Get()
  list(@Query(zod(listArticlesQuerySchema)) q: ListArticlesQuery): Promise<Page<Article>> {
    return this.news.list(q);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string): Promise<Article> {
    return this.news.getPublished(slug);
  }

  @RequirePlatformRole('editor')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body(zod(createArticleSchema)) body: CreateArticleInput): Promise<Article> {
    return this.news.create(user, body);
  }

  @RequirePlatformRole('editor')
  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(statusBody)) body: z.infer<typeof statusBody>,
  ): Promise<Article> {
    return this.news.setStatus(user, id, body.status);
  }
}
