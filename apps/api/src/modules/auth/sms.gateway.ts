import { Injectable, Logger } from '@nestjs/common';

/**
 * Port for delivering OTP messages. Adapters below; AuthModule picks one from
 * configuration, so the domain never knows which provider is in use.
 */
export abstract class SmsGateway {
  /** `code` is passed separately so template-based channels (WhatsApp) can bind it. */
  abstract send(phone: string, message: string, code: string): Promise<void>;
}

/** Development adapter: writes the message to the log instead of sending it. */
@Injectable()
export class LoggingSmsGateway extends SmsGateway {
  private readonly logger = new Logger('SMS');

  async send(phone: string, message: string, _code?: string): Promise<void> {
    this.logger.log(`→ ${phone.slice(0, -4)}****: ${message}`);
  }
}

/**
 * Generic HTTP SMS aggregator: POST {to, from, text} with a bearer token.
 * Most local aggregators expose (or can be proxied to) this shape.
 */
export class HttpSmsGateway extends SmsGateway {
  constructor(
    private readonly url: string,
    private readonly token: string | undefined,
    private readonly sender: string,
  ) {
    super();
  }

  async send(phone: string, message: string, _code?: string): Promise<void> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.token && { authorization: `Bearer ${this.token}` }) },
      body: JSON.stringify({ to: phone, from: this.sender, text: message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`SMS provider responded ${res.status}`);
  }
}

/** WhatsApp Cloud API with an approved authentication template (Meta Graph API). */
export class WhatsAppCloudGateway extends SmsGateway {
  constructor(
    private readonly phoneNumberId: string,
    private readonly token: string,
    private readonly template: string,
  ) {
    super();
  }

  async send(phone: string, _message: string, code: string): Promise<void> {
    const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'template',
        template: {
          name: this.template,
          language: { code: 'ar' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`WhatsApp API responded ${res.status}`);
  }
}
