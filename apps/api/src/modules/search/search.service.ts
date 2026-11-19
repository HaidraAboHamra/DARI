import { Injectable, Logger } from '@nestjs/common';
import { type SearchHit, type SearchQuery, type SearchResponse, stemArabic } from '@dari/contracts';
import { v7 as uuidv7 } from 'uuid';
import type { AuthUser } from '../../common/auth/auth-user';
import { JobQueue } from '../../infrastructure/queue/queue.module';
import { CitiesService } from '../cities/cities.service';
import { IntentClassifier, type IntentResult } from './intent-classifier';
import { SearchEngine, type SearchRequest } from './search-engine';

const CLASSIFIER_TTL_MS = 60_000;

/**
 * Universal search (blueprint §4): understand the need, query the right
 * entities, and log every search (incl. zero results) as demand intelligence.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private classifier: { instance: IntentClassifier; builtAt: number } | null = null;

  constructor(
    private readonly engine: SearchEngine,
    private readonly cities: CitiesService,
    private readonly queue: JobQueue,
  ) {}

  async search(query: SearchQuery, viewer: AuthUser | null, anonymousId?: string): Promise<SearchResponse> {
    const city = await this.cities.getBySlug(query.city);
    const intent = (await this.getClassifier()).classify(query.q);
    const vertical = query.vertical ?? intent.vertical;

    const request: SearchRequest = {
      cityId: city.id,
      timezone: city.timezone,
      terms: intent.terms.map(stemArabic),
      vertical: vertical === 'jobs' || vertical === 'news' ? null : vertical,
      categoryIds: query.vertical && query.vertical !== intent.vertical ? [] : intent.categoryIds,
      kinds: kindsFor(intent, vertical),
      openNow: intent.signals.openNow || intent.intent === 'urgent',
      limit: query.limit,
    };

    let hits = await this.engine.search(request);
    if (!hits.length && request.terms.length && (request.vertical || request.categoryIds.length)) {
      // The category guess may be wrong; retry across all verticals before reporting zero.
      hits = await this.engine.search({ ...request, vertical: null, categoryIds: [], kinds: ['business', 'product', 'job', 'article'] });
    }
    hits = hits.slice(0, query.limit);

    const searchId = uuidv7();
    this.log({ searchId, cityId: city.id, query: query.q, intent, vertical, results: hits.length, viewer, anonymousId });

    return {
      searchId,
      query: query.q,
      intent: { intent: intent.intent, vertical, confidence: intent.confidence, urgency: intent.signals.urgency },
      total: hits.length,
      hits,
    };
  }

  private async getClassifier(): Promise<IntentClassifier> {
    if (!this.classifier || Date.now() - this.classifier.builtAt > CLASSIFIER_TTL_MS) {
      this.classifier = { instance: new IntentClassifier(await this.cities.categoryLexicon()), builtAt: Date.now() };
    }
    return this.classifier.instance;
  }

  /** Fire-and-forget: logging must never slow down or fail a search. */
  private log(entry: {
    searchId: string;
    cityId: string;
    query: string;
    intent: IntentResult;
    vertical: string | null;
    results: number;
    viewer: AuthUser | null;
    anonymousId: string | undefined;
  }): void {
    this.queue
      .enqueueSearchLog({
        id: entry.searchId,
        cityId: entry.cityId,
        userId: entry.viewer?.id ?? null,
        anonymousId: entry.anonymousId ?? null,
        rawQuery: entry.query.slice(0, 200),
        normalizedQuery: entry.intent.normalizedQuery.slice(0, 200),
        intent: entry.intent.intent,
        intentConfidence: entry.intent.confidence,
        vertical: entry.vertical,
        resultsCount: entry.results,
        createdAt: new Date().toISOString(),
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'search log enqueue failed'));
  }
}

function kindsFor(intent: IntentResult, vertical: string | null): SearchHit['kind'][] {
  if (intent.intent === 'apply' || vertical === 'jobs') return ['job'];
  if (intent.intent === 'information' || vertical === 'news') return intent.terms.length ? ['article', 'business'] : ['article'];
  if (vertical) return ['business', 'product'];
  return ['business', 'product', 'job', 'article'];
}
