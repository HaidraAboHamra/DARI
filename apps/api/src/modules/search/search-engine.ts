import type { ListingPurpose, PropertyType, SearchHit, Vertical } from '@dari/contracts';

export interface SearchRequest {
  cityId: string;
  timezone: string;
  terms: string[];
  vertical: Vertical | null;
  categoryIds: string[];
  /** Entity kinds worth querying for this intent, most relevant first. */
  kinds: SearchHit['kind'][];
  openNow: boolean;
  property?: { purpose?: ListingPurpose; propertyType?: PropertyType };
  limit: number;
}

/**
 * Port for the search backend. The default adapter uses PostgreSQL pg_trgm,
 * which comfortably serves a city. A city network can move to OpenSearch /
 * Meilisearch by providing another adapter — the SearchService is unaffected.
 */
export abstract class SearchEngine {
  abstract search(request: SearchRequest): Promise<SearchHit[]>;
}
