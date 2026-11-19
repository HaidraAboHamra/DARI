import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { RealtimeHub } from '../../infrastructure/realtime/realtime.module';

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream of the user's live events (new orders, status
 * changes, quotes…). One long-lived HTTP response; reconnection is built into
 * the browser's EventSource.
 */
@Controller({ path: 'stream', version: '1' })
export class StreamController {
  constructor(private readonly hub: RealtimeHub) {}

  @Get()
  async stream(@CurrentUser() user: AuthUser, @Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    // Subscribe before announcing `ready`: anything published after the client sees `ready` must reach it.
    const unsubscribe = await this.hub.subscribe(user.id, (message) => res.write(`event: message\ndata: ${message}\n\n`));
    if (req.raw.destroyed) return void unsubscribe(); // client left while we were subscribing
    res.write(`retry: 5000\n\nevent: ready\ndata: {}\n\n`);
    const heartbeat = setInterval(() => res.write(`: ping\n\n`), HEARTBEAT_MS);
    req.raw.on('close', () => {
      clearInterval(heartbeat);
      void unsubscribe();
    });
  }
}
