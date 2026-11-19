import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Page } from '@dari/contracts';
import { and, desc, eq, inArray, isNull, lt, type SQL, sql } from 'drizzle-orm';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { deviceTokens, notifications } from '../../infrastructure/database/schema';
import { PushGateway } from '../../infrastructure/push/push.gateway';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime.module';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NewNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** In-app inbox. Push/SMS fan-out can subscribe to the same outbox events later. */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly realtime: RealtimePublisher,
    private readonly push: PushGateway,
  ) {}

  private readonly logger = new Logger(NotificationsService.name);

  async notify(items: NewNotification[], db: DbExecutor = this.db): Promise<void> {
    if (!items.length) return;
    await db.insert(notifications).values(items.map((n) => ({ ...n, data: n.data ?? {} })));
    // Best effort: the inbox is the source of truth, the push only makes it instant.
    await Promise.all(
      items.map((n) => this.realtime.publish([n.userId], { type: n.type, title: n.title, body: n.body, data: n.data ?? {} }).catch(() => undefined)),
    );
    await this.pushToPhones(items).catch((err: unknown) => this.logger.warn({ err }, 'push delivery failed'));
  }

  async registerDevice(userId: string, token: string, platform: string): Promise<void> {
    await this.db
      .insert(deviceTokens)
      .values({ token, userId, platform })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId, platform, lastSeenAt: sql`now()` } });
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.db.delete(deviceTokens).where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)));
  }

  /** Best effort phone push for each notification; forgets tokens the provider rejects. */
  private async pushToPhones(items: NewNotification[]): Promise<void> {
    const userIds = [...new Set(items.map((n) => n.userId))];
    const devices = await this.db.select().from(deviceTokens).where(inArray(deviceTokens.userId, userIds));
    if (!devices.length) return;
    const byUser = Map.groupBy(devices, (d) => d.userId);
    const messages = items.flatMap((n) => (byUser.get(n.userId) ?? []).map((d) => ({ token: d.token, title: n.title, body: n.body, data: { type: n.type, ...n.data } })));
    const { invalidTokens } = await this.push.send(messages);
    if (invalidTokens.length) await this.db.delete(deviceTokens).where(inArray(deviceTokens.token, invalidTokens));
  }

  /** Live ping for clients after a set-based fan-out that bypassed notify(). */
  async ping(userIds: string[], type: string): Promise<void> {
    await this.realtime.publish(userIds, { type }).catch(() => undefined);
  }

  async list(userId: string, cursor: string | undefined, limit: number): Promise<Page<NotificationDto> & { unread: number }> {
    const conditions: SQL[] = [eq(notifications.userId, userId)];
    const after = decodeCursor<[string]>(cursor, 1);
    if (after) conditions.push(lt(notifications.id, after[0]));
    const [rows, [unread]] = await Promise.all([
      this.db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.id)).limit(limit + 1),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    ]);
    const page = toPage(
      rows,
      limit,
      (n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      }),
      (n) => [n.id],
    );
    return { ...page, unread: unread?.n ?? 0 };
  }

  async markRead(userId: string, ids: string[]): Promise<void> {
    const scope = ids.length ? inArray(notifications.id, ids) : undefined;
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), scope));
  }
}
