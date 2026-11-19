import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';

/** One registry per process; scraped by Prometheus at /metrics. */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'dari_' });

export const httpDuration = new Histogram({
  name: 'dari_http_request_duration_seconds',
  help: 'HTTP request latency by route template',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpErrors = new Counter({
  name: 'dari_http_server_errors_total',
  help: '5xx responses by route template',
  labelNames: ['route'] as const,
  registers: [registry],
});

export const dbPool = new Gauge({
  name: 'dari_db_pool_connections',
  help: 'Postgres pool connections by state',
  labelNames: ['pool', 'state'] as const,
  registers: [registry],
});

export const realtimeConnections = new Gauge({ name: 'dari_realtime_connections', help: 'Open SSE streams on this instance', registers: [registry] });
export const outboxBacklog = new Gauge({ name: 'dari_outbox_backlog', help: 'Unprocessed outbox events', registers: [registry] });
