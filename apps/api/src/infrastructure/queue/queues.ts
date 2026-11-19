/** Names and payloads of every background queue. Producers and consumers share this file. */
export const QUEUES = {
  analytics: 'analytics',
  searchLog: 'search-log',
} as const;

export interface AnalyticsEventRow {
  id: string;
  name: string;
  cityId: string | null;
  userId: string | null;
  anonymousId: string | null;
  entityType: string | null;
  entityId: string | null;
  searchId: string | null;
  props: Record<string, string | number | boolean> | null;
  occurredAt: string;
  receivedAt: string;
}

export interface AnalyticsJob {
  events: AnalyticsEventRow[];
}

export interface SearchLogJob {
  id: string;
  cityId: string;
  userId: string | null;
  anonymousId: string | null;
  rawQuery: string;
  normalizedQuery: string;
  intent: string;
  intentConfidence: number;
  vertical: string | null;
  resultsCount: number;
  createdAt: string;
}
