'use client';

import type { AnalyticsEventName, EntityType } from '@dari/contracts';

interface TrackedEvent {
  name: AnalyticsEventName;
  entityType?: EntityType;
  entityId?: string;
  searchId?: string;
  props?: Record<string, string | number | boolean>;
  occurredAt: string;
}

const FLUSH_MS = 4_000;
const MAX_BATCH = 20;
let buffer: TrackedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Batched, fire-and-forget product analytics. Events are buffered and sent with
 * sendBeacon so tracking never blocks the UI or delays navigation.
 */
export function track(event: Omit<TrackedEvent, 'occurredAt'>): void {
  if (typeof window === 'undefined') return;
  buffer.push({ ...event, occurredAt: new Date().toISOString() });
  if (buffer.length >= MAX_BATCH) flush();
  else timer ??= setTimeout(flush, FLUSH_MS);
}

function flush(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!buffer.length) return;
  const body = JSON.stringify({ events: buffer.splice(0, MAX_BATCH) });
  const sent = navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }));
  if (!sent) void fetch('/api/events', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
