export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  /** Tokens the provider reports as no longer valid; callers should forget them. */
  invalidTokens: string[];
}

/** Port for phone push delivery (APNs/FCM through a provider). */
export abstract class PushGateway {
  abstract send(messages: PushMessage[]): Promise<PushResult>;
}

export class NoopPushGateway extends PushGateway {
  async send(): Promise<PushResult> {
    return { invalidTokens: [] };
  }
}

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

/** Expo Push Service: one HTTPS API in front of APNs and FCM. */
export class ExpoPushGateway extends PushGateway {
  constructor(private readonly accessToken?: string) {
    super();
  }

  async send(messages: PushMessage[]): Promise<PushResult> {
    const invalidTokens: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const res = await fetch(EXPO_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.accessToken && { authorization: `Bearer ${this.accessToken}` }),
        },
        body: JSON.stringify(batch.map((m) => ({ to: m.token, title: m.title, body: m.body, data: m.data ?? {}, sound: 'default' }))),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Expo push responded ${res.status}`);
      const { data } = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      data?.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(batch[index]!.token);
      });
    }
    return { invalidTokens };
  }
}
