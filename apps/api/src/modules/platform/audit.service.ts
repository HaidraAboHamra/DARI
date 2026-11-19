import { Injectable } from '@nestjs/common';
import type { DbExecutor } from '../../infrastructure/database/database.module';
import { auditLogs } from '../../infrastructure/database/schema';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  businessId?: string | null;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Append-only audit trail for sensitive operations (blueprint §16.2). */
@Injectable()
export class AuditService {
  async record(tx: DbExecutor, entry: AuditEntry): Promise<void> {
    await tx.insert(auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      businessId: entry.businessId ?? null,
      changes: entry.changes ?? null,
      ip: entry.ip ?? null,
    });
  }
}
