import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateOrderInput,
  createOrderSchema,
  type ListOrdersQuery,
  listOrdersQuerySchema,
  type Order,
  type Page,
  type UpdateOrderStatusInput,
  updateOrderStatusSchema,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { OrdersService } from './orders.service';

const idempotencyKey = z.string().trim().min(8).max(100).optional();

@Controller({ version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  place(
    @CurrentUser() user: AuthUser,
    @Body(zod(createOrderSchema)) body: CreateOrderInput,
    @Headers('idempotency-key') key?: string,
  ): Promise<Order> {
    return this.orders.place(user, body, idempotencyKey.parse(key));
  }

  @Get('orders')
  mine(@CurrentUser() user: AuthUser, @Query(zod(listOrdersQuerySchema)) q: ListOrdersQuery): Promise<Page<Order>> {
    return this.orders.listMine(user, q);
  }

  @Get('orders/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orders.get(user, id);
  }

  @Patch('orders/:id/status')
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(updateOrderStatusSchema)) body: UpdateOrderStatusInput,
  ): Promise<Order> {
    return this.orders.changeStatus(user, id, body);
  }

  @Get('merchant/businesses/:id/orders')
  forBusiness(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Query(zod(listOrdersQuerySchema)) q: ListOrdersQuery,
  ): Promise<Page<Order>> {
    return this.orders.listForBusiness(user, businessId, q);
  }
}
