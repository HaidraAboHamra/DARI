import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  availabilityQuerySchema,
  type BookableResource,
  type Booking,
  type CreateBookingInput,
  createBookingSchema,
  type CreateResourceInput,
  createResourceSchema,
  type ListBookingsQuery,
  listBookingsQuerySchema,
  type Page,
  type UpdateBookingStatusInput,
  updateBookingStatusSchema,
  type UpdateResourceInput,
  updateResourceSchema,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { BookingsService } from './bookings.service';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nightsQuery = z.object({ checkIn: isoDate, checkOut: isoDate });

@Controller({ version: '1' })
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Public()
  @Get('businesses/:id/resources')
  resources(@Param('id', ParseUUIDPipe) businessId: string): Promise<BookableResource[]> {
    return this.bookings.listPublicResources(businessId);
  }

  @Public()
  @Get('resources/:id/slots')
  slots(@Param('id', ParseUUIDPipe) id: string, @Query(zod(availabilityQuerySchema)) q: { date: string }) {
    return this.bookings.slots(id, q.date);
  }

  @Public()
  @Get('resources/:id/nights')
  nights(@Param('id', ParseUUIDPipe) id: string, @Query(zod(nightsQuery)) q: z.infer<typeof nightsQuery>) {
    return this.bookings.nights(id, q.checkIn, q.checkOut);
  }

  @Post('bookings')
  book(@CurrentUser() user: AuthUser, @Body(zod(createBookingSchema)) body: CreateBookingInput): Promise<Booking> {
    return this.bookings.book(user, body);
  }

  @Get('bookings')
  mine(@CurrentUser() user: AuthUser, @Query(zod(listBookingsQuerySchema)) q: ListBookingsQuery): Promise<Page<Booking>> {
    return this.bookings.listMine(user, q);
  }

  @Get('bookings/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookings.get(user, id);
  }

  @Patch('bookings/:id/status')
  status(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(updateBookingStatusSchema)) body: UpdateBookingStatusInput): Promise<Booking> {
    return this.bookings.changeStatus(user, id, body);
  }

  @Get('merchant/businesses/:id/resources')
  merchantResources(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<BookableResource[]> {
    return this.bookings.listResources(user, id);
  }

  @Post('merchant/businesses/:id/resources')
  createResource(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(createResourceSchema)) body: CreateResourceInput) {
    return this.bookings.createResource(user, id, body);
  }

  @Patch('merchant/businesses/:id/resources/:resourceId')
  updateResource(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body(zod(updateResourceSchema)) body: UpdateResourceInput,
  ) {
    return this.bookings.updateResource(user, id, resourceId, body);
  }

  @Get('merchant/businesses/:id/bookings')
  forBusiness(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query(zod(listBookingsQuerySchema)) q: ListBookingsQuery): Promise<Page<Booking>> {
    return this.bookings.listForBusiness(user, id, q);
  }
}
