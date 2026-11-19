import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { OutboxService } from './outbox.service';

@Global()
@Module({ providers: [OutboxService, AuditService], exports: [OutboxService, AuditService] })
export class PlatformModule {}
