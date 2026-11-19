import { Injectable, Logger } from '@nestjs/common';

/**
 * Port for delivering OTP messages. Swap the binding in AuthModule for a real
 * provider (SMS aggregator, WhatsApp Business API) without touching the domain.
 */
export abstract class SmsGateway {
  abstract send(phone: string, message: string): Promise<void>;
}

/** Development adapter: writes the message to the log instead of sending it. */
@Injectable()
export class LoggingSmsGateway extends SmsGateway {
  private readonly logger = new Logger('SMS');

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`→ ${phone.slice(0, -4)}****: ${message}`);
  }
}
