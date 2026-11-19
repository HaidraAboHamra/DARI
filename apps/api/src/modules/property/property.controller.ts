import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateListingInput,
  createListingSchema,
  type ListListingsQuery,
  listListingsQuerySchema,
  type Page,
  type PropertyListing,
  type UpdateListingInput,
  updateLeadSchema,
  updateListingSchema,
  type ViewingLead,
  type ViewingRequestInput,
  viewingRequestSchema,
} from '@dari/contracts';
import type { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, OptionalUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { PropertyService } from './property.service';

@Controller({ version: '1' })
export class PropertyController {
  constructor(private readonly property: PropertyService) {}

  @Public()
  @Get('listings')
  list(@Query(zod(listListingsQuerySchema)) q: ListListingsQuery): Promise<Page<PropertyListing>> {
    return this.property.list(q);
  }

  @Get('me/listings')
  mine(@CurrentUser() user: AuthUser): Promise<PropertyListing[]> {
    return this.property.mine(user);
  }

  @Get('me/listings/leads')
  leads(@CurrentUser() user: AuthUser): Promise<ViewingLead[]> {
    return this.property.myLeads(user);
  }

  @Patch('me/listings/leads/:id')
  @HttpCode(204)
  setLead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(updateLeadSchema)) body: z.infer<typeof updateLeadSchema>): Promise<void> {
    return this.property.setLeadStatus(user, id, body.status);
  }

  @Public()
  @Get('listings/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() viewer: AuthUser | null): Promise<PropertyListing> {
    return this.property.get(id, viewer);
  }

  @Post('listings')
  create(@CurrentUser() user: AuthUser, @Body(zod(createListingSchema)) body: CreateListingInput): Promise<PropertyListing> {
    return this.property.create(user, body);
  }

  @Patch('listings/:id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(updateListingSchema)) body: UpdateListingInput): Promise<PropertyListing> {
    return this.property.update(user, id, body);
  }

  @Post('listings/:id/viewings')
  viewing(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(viewingRequestSchema)) body: ViewingRequestInput): Promise<ViewingLead> {
    return this.property.requestViewing(user, id, body);
  }
}
