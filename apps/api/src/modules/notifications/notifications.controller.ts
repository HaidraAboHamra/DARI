import { Body, Controller, Delete, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { cursorQuerySchema, type CursorQuery } from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { NotificationsService } from './notifications.service';

const readBody = z.object({ ids: z.array(z.uuid()).max(100).default([]) });
const deviceBody = z.object({ token: z.string().trim().min(10).max(300), platform: z.enum(['ios', 'android', 'web']) });

@Controller({ path: 'me', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(@CurrentUser() user: AuthUser, @Query(zod(cursorQuerySchema)) q: CursorQuery) {
    return this.notifications.list(user.id, q.cursor, q.limit);
  }

  /** Marks the given notifications (or all, when `ids` is empty) as read. */
  @Post('notifications/read')
  @HttpCode(204)
  read(@CurrentUser() user: AuthUser, @Body(zod(readBody)) body: z.infer<typeof readBody>): Promise<void> {
    return this.notifications.markRead(user.id, body.ids);
  }

  @Put('devices')
  @HttpCode(204)
  registerDevice(@CurrentUser() user: AuthUser, @Body(zod(deviceBody)) body: z.infer<typeof deviceBody>): Promise<void> {
    return this.notifications.registerDevice(user.id, body.token, body.platform);
  }

  @Delete('devices')
  @HttpCode(204)
  unregisterDevice(@CurrentUser() user: AuthUser, @Body(zod(deviceBody.pick({ token: true }))) body: { token: string }): Promise<void> {
    return this.notifications.unregisterDevice(user.id, body.token);
  }
}
