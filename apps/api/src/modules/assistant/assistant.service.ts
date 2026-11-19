import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AssistantReply, SearchResponse } from '@dari/contracts';
import type Redis from 'ioredis';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import type { AuthUser } from '../../common/auth/auth-user';
import { RateLimitedError } from '../../common/errors/app-error';
import { REDIS } from '../../infrastructure/redis/redis.module';
import { SearchService } from '../search/search.service';
import { actionsFor, hitHref, hitTitle, rulesReply } from './assistant-replies';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `أنت «داري»، مساعد مدينة سلمية في سوريا داخل تطبيق داري.
مهمتك: تحويل حاجة المستخدم إلى خطوة عملية (مطعم، خدمة، حجز، وظيفة، عقار، فعالية، خبر).
- اكتب بالعربية بلهجة شامية لطيفة وواضحة، وبجمل قصيرة (لا تتجاوز 70 كلمة).
- اعتمد فقط على النتائج المرفقة من دليل داري. لا تخترع أسماء أو أسعاراً أو أرقام هواتف أو مواعيد غير موجودة فيها.
- إذا لم توجد نتائج مناسبة، قل ذلك بصراحة واقترح إعادة الصياغة أو خدمة «اشترِ لي».
- في المواضيع الصحية: وجّه إلى الطبيب أو الصيدلية ولا تقدّم تشخيصاً أو جرعات.
- لا تكرر الروابط؛ الأزرار تظهر للمستخدم تلقائياً تحت ردك.`;

/**
 * City AI assistant (blueprint §15.1): text → understood need → real results →
 * a short answer and next-step actions. Grounded in our own search results;
 * the language model only phrases them. Works without a model (rules engine).
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly search: SearchService,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    this.client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 }) : null;
  }

  async reply(
    message: string,
    history: AssistantTurn[],
    citySlug: string,
    viewer: AuthUser | null,
    clientKey: string,
  ): Promise<AssistantReply> {
    await this.enforceQuota(viewer?.id ?? `ip:${clientKey}`);
    const result = await this.search.search({ q: message, city: citySlug, limit: 6 }, viewer);
    const base = { intent: result.intent.intent, hits: result.hits, actions: actionsFor(result) };

    if (!this.client) return { ...base, reply: rulesReply(result), engine: 'rules' };
    try {
      const text = await this.llmReply(message, history, result);
      return text ? { ...base, reply: text, engine: 'llm' } : { ...base, reply: rulesReply(result), engine: 'rules' };
    } catch (err) {
      this.logger.warn({ err }, 'assistant LLM call failed; using rules reply');
      return { ...base, reply: rulesReply(result), engine: 'rules' };
    }
  }

  private async llmReply(message: string, history: AssistantTurn[], result: SearchResponse): Promise<string | null> {
    const facts = {
      understood: result.intent,
      results: result.hits.map((h) => ({ kind: h.kind, title: hitTitle(h), link: hitHref(h), details: summarize(h.item) })),
    };
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...history.slice(-6).map((t) => ({ role: t.role, content: t.content })),
      {
        role: 'user',
        content: `${message}\n\n<dari_results>\n${JSON.stringify(facts)}\n</dari_results>`,
      },
    ];
    // Conversations must start with a user turn.
    while (messages[0]?.role === 'assistant') messages.shift();

    const response = await this.client!.beta.messages.create({
      model: this.env.ASSISTANT_MODEL,
      max_tokens: 2000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      // On a safety decline the API retries on a suitable model inside the same call.
      fallbacks: 'default',
      messages,
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return text || null;
  }

  /** Fixed-window hourly quota per user/IP: keeps LLM spend predictable under load. */
  private async enforceQuota(key: string): Promise<void> {
    const redisKey = `assistant:quota:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) await this.redis.expire(redisKey, 3600);
    if (count > this.env.ASSISTANT_HOURLY_LIMIT) throw new RateLimitedError(Math.max(await this.redis.ttl(redisKey), 1));
  }
}

function summarize(item: object): Record<string, unknown> {
  const pick = ['categoryName', 'areaName', 'ratingAvg', 'price', 'businessName', 'employmentType', 'startsAt', 'venue', 'seatsLeft', 'purpose', 'propertyType', 'summary', 'acceptsOrders'];
  return Object.fromEntries(Object.entries(item).filter(([k, v]) => pick.includes(k) && v !== null && v !== undefined));
}
