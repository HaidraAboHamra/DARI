import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateQuoteInput,
  createQuoteSchema,
  type CreateServiceRequestInput,
  createServiceRequestSchema,
  cursorQuerySchema,
  type CursorQuery,
  type Page,
  providerInboxQuerySchema,
  type ServiceRequest,
  type UpdateServiceStatusInput,
  updateServiceStatusSchema,
} from '@dari/contracts';
import type { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { ServiceRequestsService } from './services.service';

@Controller({ version: '1' })
export class ServiceRequestsController {
  constructor(private readonly services: ServiceRequestsService) {}

  @Post('service-requests')
  create(@CurrentUser() user: AuthUser, @Body(zod(createServiceRequestSchema)) body: CreateServiceRequestInput): Promise<ServiceRequest> {
    return this.services.create(user, body);
  }

  @Get('service-requests')
  mine(@CurrentUser() user: AuthUser, @Query(zod(cursorQuerySchema)) q: CursorQuery): Promise<Page<ServiceRequest>> {
    return this.services.listMine(user, q.cursor, q.limit);
  }

  @Get('service-requests/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ServiceRequest> {
    return this.services.get(user, id);
  }

  @Post('service-requests/:id/quotes')
  quote(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(createQuoteSchema)) body: CreateQuoteInput): Promise<ServiceRequest> {
    return this.services.quote(user, id, body);
  }

  @Post('service-requests/:id/quotes/:quoteId/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('quoteId', ParseUUIDPipe) quoteId: string): Promise<ServiceRequest> {
    return this.services.acceptQuote(user, id, quoteId);
  }

  @Patch('service-requests/:id/status')
  status(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(updateServiceStatusSchema)) body: UpdateServiceStatusInput): Promise<ServiceRequest> {
    return this.services.changeStatus(user, id, body);
  }

  @Get('provider/requests')
  inbox(@CurrentUser() user: AuthUser, @Query(zod(providerInboxQuerySchema)) q: z.infer<typeof providerInboxQuerySchema>): Promise<Page<ServiceRequest>> {
    return this.services.providerInbox(user, q.businessId, q.cursor, q.limit);
  }
}
