import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { cursorQuerySchema, type CursorQuery } from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { NotificationsService } from './notifications.service';

const readBody = z.object({ ids: z.array(z.uuid()).max(100).default([]) });

@Controller({ path: 'me/notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query(zod(cursorQuerySchema)) q: CursorQuery) {
    return this.notifications.list(user.id, q.cursor, q.limit);
  }

  /** Marks the given notifications (or all, when `ids` is empty) as read. */
  @Post('read')
  @HttpCode(204)
  read(@CurrentUser() user: AuthUser, @Body(zod(readBody)) body: z.infer<typeof readBody>): Promise<void> {
    return this.notifications.markRead(user.id, body.ids);
  }
}
