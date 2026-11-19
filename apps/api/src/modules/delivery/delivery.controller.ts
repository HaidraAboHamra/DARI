import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateDeliveryInput,
  createDeliverySchema,
  cursorQuerySchema,
  type CursorQuery,
  type DeliveryTask,
  type Page,
  type UpdateDeliveryStatusInput,
  updateDeliveryStatusSchema,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { DeliveryService } from './delivery.service';

const boardQuery = cursorQuerySchema.extend({ city: z.string().trim().min(2).max(60) });

@Controller({ path: 'deliveries', version: '1' })
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post()
  request(@CurrentUser() user: AuthUser, @Body(zod(createDeliverySchema)) body: CreateDeliveryInput): Promise<DeliveryTask> {
    return this.delivery.request(user, body);
  }

  @Get()
  mine(@CurrentUser() user: AuthUser, @Query(zod(cursorQuerySchema)) q: CursorQuery): Promise<Page<DeliveryTask>> {
    return this.delivery.listMine(user, q.cursor, q.limit);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<DeliveryTask> {
    return this.delivery.cancel(user, id);
  }

  @RequirePlatformRole('courier')
  @Get('board')
  board(@Query(zod(boardQuery)) q: z.infer<typeof boardQuery>): Promise<Page<DeliveryTask>> {
    return this.delivery.board(q.city, q.cursor, q.limit);
  }

  @RequirePlatformRole('courier')
  @Get('assigned')
  assigned(@CurrentUser() user: AuthUser, @Query(zod(cursorQuerySchema)) q: CursorQuery): Promise<Page<DeliveryTask>> {
    return this.delivery.assignedToMe(user, q.cursor, q.limit);
  }

  @RequirePlatformRole('courier')
  @Post(':id/claim')
  @HttpCode(200)
  claim(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<DeliveryTask> {
    return this.delivery.claim(user, id);
  }

  @RequirePlatformRole('courier')
  @Patch(':id/status')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(updateDeliveryStatusSchema)) body: UpdateDeliveryStatusInput,
  ): Promise<DeliveryTask> {
    return this.delivery.updateByCourier(user, id, body.status);
  }
}
