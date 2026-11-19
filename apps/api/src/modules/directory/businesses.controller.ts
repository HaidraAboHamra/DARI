import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type AddMemberInput,
  addMemberSchema,
  BUSINESS_STATUSES,
  type BusinessDetail,
  type BusinessSummary,
  type CreateBusinessInput,
  createBusinessSchema,
  type ListBusinessesQuery,
  listBusinessesQuerySchema,
  type Membership,
  type Page,
  type UpdateBusinessInput,
  updateBusinessSchema,
  VERTICALS,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, OptionalUser, Public, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { BusinessesService } from './businesses.service';

const statusBody = z.object({ status: z.enum(BUSINESS_STATUSES) });
const mapQuery = z.object({ city: z.string().trim().min(2).max(60), vertical: z.enum(VERTICALS).optional() });
const statusQuery = z.object({ status: z.enum(BUSINESS_STATUSES).default('pending_review') });

@Controller({ version: '1' })
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get('businesses')
  list(@Query(zod(listBusinessesQuerySchema)) query: ListBusinessesQuery): Promise<Page<BusinessSummary>> {
    return this.businesses.list(query);
  }

  @Public()
  @Get('businesses/map')
  map(@Query(zod(mapQuery)) q: z.infer<typeof mapQuery>) {
    return this.businesses.mapPoints(q.city, q.vertical);
  }

  @Public()
  @Get('businesses/by-slug/:slug')
  bySlug(@Param('slug') slug: string, @OptionalUser() viewer: AuthUser | null): Promise<BusinessDetail> {
    return this.businesses.getPublicPage(slug, viewer);
  }

  @Post('businesses')
  create(@CurrentUser() user: AuthUser, @Body(zod(createBusinessSchema)) body: CreateBusinessInput): Promise<BusinessDetail> {
    return this.businesses.create(user, body);
  }

  @Get('me/businesses')
  mine(@CurrentUser() user: AuthUser): Promise<Membership[]> {
    return this.businesses.myMemberships(user);
  }

  @Get('merchant/businesses/:id')
  getOwn(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.businesses.getForMember(user, id);
  }

  @Patch('merchant/businesses/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(updateBusinessSchema)) body: UpdateBusinessInput,
  ): Promise<BusinessDetail> {
    return this.businesses.update(user, id, body);
  }

  @Get('merchant/businesses/:id/members')
  members(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.businesses.listMembers(user, id);
  }

  @Post('merchant/businesses/:id/members')
  @HttpCode(204)
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(addMemberSchema)) body: AddMemberInput,
  ): Promise<void> {
    return this.businesses.addMember(user, id, body);
  }

  @Delete('merchant/businesses/:id/members/:userId')
  @HttpCode(204)
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.businesses.removeMember(user, id, memberId);
  }

  @RequirePlatformRole('admin')
  @Get('admin/businesses')
  moderationQueue(@Query(zod(statusQuery)) q: z.infer<typeof statusQuery>): Promise<BusinessDetail[]> {
    return this.businesses.listForModeration(q.status);
  }

  @RequirePlatformRole('admin')
  @Patch('admin/businesses/:id/status')
  setStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(statusBody)) body: z.infer<typeof statusBody>,
  ): Promise<BusinessDetail> {
    return this.businesses.setStatus(admin, id, body.status);
  }
}
