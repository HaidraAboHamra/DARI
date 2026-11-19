import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  type BuyTicketsInput,
  buyTicketsSchema,
  type CheckInInput,
  checkInSchema,
  type CityEvent,
  type CreateEventInput,
  createEventSchema,
  type ListEventsQuery,
  listEventsQuerySchema,
  type Page,
  type Ticket,
} from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { EventsService } from './events.service';

@Controller({ version: '1' })
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get('events')
  list(@Query(zod(listEventsQuerySchema)) q: ListEventsQuery): Promise<Page<CityEvent>> {
    return this.events.list(q);
  }

  @Get('events/organized')
  organized(@CurrentUser() user: AuthUser): Promise<CityEvent[]> {
    return this.events.organizedBy(user);
  }

  @Public()
  @Get('events/:id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CityEvent> {
    return this.events.get(id);
  }

  @Post('events')
  create(@CurrentUser() user: AuthUser, @Body(zod(createEventSchema)) body: CreateEventInput): Promise<CityEvent> {
    return this.events.create(user, body);
  }

  @Post('events/:id/tickets')
  buy(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(buyTicketsSchema)) body: BuyTicketsInput): Promise<Ticket> {
    return this.events.buy(user, id, body);
  }

  @Get('me/tickets')
  tickets(@CurrentUser() user: AuthUser): Promise<Ticket[]> {
    return this.events.myTickets(user);
  }

  @Post('me/tickets/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Ticket> {
    return this.events.cancelTicket(user, id);
  }

  @Post('events/:id/check-in')
  @HttpCode(200)
  checkIn(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(checkInSchema)) body: CheckInInput) {
    return this.events.checkIn(user, id, body.code);
  }

  @Get('events/:id/attendees')
  attendees(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.attendees(user, id);
  }
}
