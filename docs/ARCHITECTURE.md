# Dari Architecture

This document explains how the code is organized, why, and what has to happen
(in infrastructure and code) to go from the Salamiyah pilot to millions of users.

## 1. Principles

1. **City is a dimension.** Every city-scoped table carries `city_id`; city
   settings (delivery fee, which verticals take orders) live in `cities.config`.
   Opening a new city is data + operations, not a fork.
2. **One source of truth for the domain.** `packages/contracts` holds the
   vocabulary (enums), validation (zod), API types, the order state machine,
   Arabic normalization and opening-hours logic. The API and the web import
   the same code, so they cannot drift.
3. **Modular monolith first.** One deployable API with strict module seams
   (each module owns its tables and exposes services). This is the fastest way
   to build correctly with a small team, and the seams are where services can
   be extracted later — without a rewrite.
4. **Stateless compute, state in managed stores.** API and web hold no
   in-memory session state, so they scale horizontally behind a load balancer.
5. **Never lose a write, never block a read.** State changes and their domain
   events commit in one transaction (outbox). Analytics and search logs go
   through queues so spikes never slow down user requests.

## 2. Runtime topology

```
           ┌────────────── CDN (static assets, cached public pages) ──────────────┐
Browser ──▶│ web (Next.js, N replicas)  — BFF: httpOnly cookies, server actions     │
           └──────────────────────────────┬───────────────────────────────────────┘
                                          │ REST /api/v1 (JWT)
                         ┌────────────────▼────────────────┐
                         │ api (NestJS/Fastify, N replicas) │──▶ Redis (cache, rate limit, OTP, queues)
                         └───────┬───────────────┬─────────┘
                    writes ──────┘               └────── heavy reads
                ┌──────────▼─────────┐     ┌──────────▼──────────┐
                │ Postgres primary    │────▶│ Postgres read replica│  (search, listings, insights)
                └──────────▲─────────┘     └─────────────────────┘
                           │ outbox poll (SKIP LOCKED) / bulk inserts
                ┌──────────┴──────────┐
                │ worker (M replicas)  │◀── BullMQ queues (analytics, search-log)
                └─────────────────────┘
```

The API and worker are the **same image** with different commands, so they
always ship identical domain code.

## 3. API module map

| Module | Owns | Notes |
|---|---|---|
| `auth` | sessions | Phone OTP (hashed in Redis, per-phone/IP limits, 5 attempts), 15-min JWT + rotating refresh tokens with **replay detection** (reusing an old refresh token revokes the session). `SmsGateway` is a port — plug in an SMS/WhatsApp provider. |
| `users` | users | Phone is identity; upsert is race-safe. |
| `cities` | cities, areas, categories | Read-mostly, Redis-cached. Category keywords feed the intent engine. |
| `directory` | businesses, members, reviews*, customer relationships* | Onboarding → `pending_review` → admin verification. RBAC matrix in `business-permissions.ts` (owner, manager, cashier, warehouse, delivery, marketing, accountant, viewer). |
| `catalog` | products | Soft delete, optional stock tracking, menu cache with invalidation. |
| `orders` | orders, items, status history | Atomic placement (price snapshot + conditional stock decrement), **Idempotency-Key**, single transition path validated by the shared state machine, stock released on cancel/reject, CRM updated on completion. |
| `delivery` | delivery tasks | Generic engine (not food-only): buy-for-me, documents, parcels. Compare-and-set **claim** so two couriers never get the same task. Courier progress drives the order status. |
| `jobs`, `news`, `reviews` | — | Job board with single application per user; editorial news; detailed reviews (quality/commitment/interaction), self-review blocked, names masked. |
| `search` | search logs | See §5. |
| `analytics` | analytics_events | Batched ingestion → queue → bulk insert. |
| `insights` | search_demand_daily | City KPIs (north star: *completed needs*), zero-result demand, opportunity engine, merchant overview, CRM segments. Reads roll-ups only. |
| `notifications` | notifications | In-app inbox fed by outbox handlers. |

\* written by those modules' services through clearly named methods.

Dependency direction is one-way. Example: `delivery → orders`, while orders
reach delivery only through the `order.status_changed` event (handled by the
worker), so there is no cycle.

## 4. Data layer

- **UUIDv7 primary keys** — globally unique (safe for multi-region/sharding),
  time-ordered (sequential B-tree inserts), and sortable: most lists paginate by
  `id` alone.
- **Keyset pagination everywhere** (opaque cursors). OFFSET is never used.
- **Money** is integer SYP; order lines snapshot name and price.
- **Indexes** match the actual queries (e.g. `(city_id, status, vertical, rating_avg desc, id desc)` for the directory).
- **`analytics_events` is RANGE-partitioned by month**; the worker idempotently
  pre-creates the next partitions every hour; old months can be detached/archived in O(1).
- **Migrations** are SQL files generated by drizzle-kit plus hand-written ones
  (extensions, partitioning). Run them as a separate job before deploying.
- **Audit log** for sensitive operations (business changes, status, members).

## 5. Search & intent engine

1. `normalizeArabic` unifies alef/yaa/taa-marbuta, strips diacritics/tatweel,
   converts Arabic-Indic digits — identically at index and query time.
2. `IntentClassifier` (pure, unit-tested) turns dialect text into a structured
   need: intent (12 types from the blueprint), vertical, categories, signals
   (urgency «هلق/مناوبة», open-now «فاتح», cheap, near). Category keywords
   come from the DB, so vocabulary grows without deploys.
3. `SearchEngine` is a **port**; the Postgres adapter uses `pg_trgm`
   (word-similarity for typos + substring, both GIN-indexed) on the read
   replica, filters open-now in the city's time zone, and ranks by intent.
4. Every search is logged asynchronously; zero-result searches roll up daily
   into `search_demand_daily` — the "what is the city missing" signal.

## 6. Security

- Tokens never reach browser JavaScript (httpOnly, SameSite=Lax cookies; the
  web app is a BFF). Silent refresh happens in `proxy.ts`.
- All input is validated by shared zod schemas; errors are uniform JSON with a
  request id. Helmet, CORS allow-list, global rate limit in Redis, stricter OTP
  limits, body size limit, statement timeouts.
- Authorization is enforced in the API on every call (global guard + per-business
  permission checks); the web only hides UI.
- Privacy by design (Syrian Personal Data Protection Law No. 12 of 2024 should
  be reviewed by counsel before launch): merchants see only their own
  customers, phone numbers are not exposed without consent, review authors are
  masked, analytics are aggregated for insights.

## 7. Scaling to millions of users — what is ready and what to add

Ready in the code today:

- Horizontal scaling of web, API and worker (stateless; outbox uses `SKIP LOCKED`).
- Read/write split (`DATABASE_REPLICA_URL`), connection pool limits, statement timeouts.
- Redis caching of hot reads with explicit invalidation; Next caches public pages.
- Async ingestion of high-volume writes; bulk inserts; partitioned event table.
- Idempotent writes and race-safe stock/claims verified by concurrent tests.

To add as traffic grows (in roughly this order):

| Trigger | Action |
|---|---|
| Launch | Managed Postgres with a replica + PgBouncer (transaction pooling), managed Redis, CDN in front of web, object storage for images, real SMS/WhatsApp gateway, error tracking (Sentry) and metrics (OpenTelemetry → Prometheus/Grafana), backups + PITR. |
| Multiple cities / ~100k DAU | Kubernetes HPA on CPU/RPS for api/web, separate worker pools per queue, Redis Cluster, WebSocket/SSE channel fed by outbox events (replace polling on merchant/courier boards). |
| Search load or relevance needs | Swap the `SearchEngine` adapter to OpenSearch/Meilisearch, indexed from outbox events. |
| ~1M+ DAU | Move analytics to a columnar store (ClickHouse) via the same queue; extract hot modules (search, orders/delivery) into services along existing seams; consider sharding by `city_id`. |
| Geo dispatch | PostGIS (or H3 cells) for nearest-courier/nearest-business queries. |

Load-test (k6) each stage before the traffic arrives; scale on measurements,
not guesses — exactly the "revenue/evidence before cost" rule from the
financial blueprint.
