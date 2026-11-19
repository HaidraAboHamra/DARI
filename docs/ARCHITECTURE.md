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
| `notifications` | notifications | In-app inbox fed by outbox handlers; every notification is also pushed live (§5b). |
| `bookings` | bookable_resources, bookings | One engine for appointments, courts, rooms, farms: weekly hours → slots in the city time zone, nights for stays, capacity per resource. Bookings are serialized per resource with a Postgres advisory lock, so the last slot can't be double-booked. Shared booking state machine. |
| `services` | service_requests, service_quotes | Provider OS: request → matching providers notified → one quote per provider → customer accepts one (compare-and-set) → on the way → arrived → completed. Customer phone/address revealed only to the assigned provider; competitors never see each other's prices. |
| `events` | events, tickets | Events & trips: seats reserved by a conditional `UPDATE … WHERE seats_taken + n <= capacity`, short ticket codes + QR, door check-in once (camera via BarcodeDetector or manual). |
| `property` | property_listings, viewing_requests | Listings with filters, featured-first keyset ordering, viewing requests as owner leads. |
| `marketing` | coupons, broadcasts, favorites, customer_relationships (consent) | Customer Connect opt-in/out, broadcasts only to consenting customers (1/day, set-based fan-out in SQL), coupons redeemed atomically inside the order transaction and released on cancel, favorites. |
| `admin` | plan_payments | Manual subscription billing (revenue-first), featured placement, staff roles — all audited. Plan limits/feature gates are enforced by `PlansService`. |
| `media` | media | Upload port: local disk (dev) or S3/R2/MinIO; magic-byte sniffing, 5 MB cap, immutable caching. |
| `assistant` | — | City AI (§5c). |
| `realtime`, `metrics` | — | SSE stream (§5b) and Prometheus `/metrics` (§7). |

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

## 5b. Realtime

Every notification is published to Redis channel `rt:user:<id>`. Each API
instance subscribes to a user's channel only while that user has an open
`GET /api/v1/stream` (Server-Sent Events) on that instance — reference counted —
so instances receive only the traffic they serve. The web app proxies the stream
same-origin (`/api/stream`, token stays in the httpOnly cookie) and refreshes the
current screen on each event, falling back to polling if the stream is down.
Couriers get a ping whenever a new delivery task appears.

## 5c. City AI assistant

1. The intent engine + universal search run first (and log demand like any search).
2. With `ANTHROPIC_API_KEY`, one Claude call phrases a short Arabic answer **only
   from those results** (system prompt forbids inventing names, prices or phones;
   health questions are routed to professionals). Effort `low`, server-side
   refusal fallback enabled, prompt prefix cached.
3. Without a key, or on any model error/refusal, a deterministic rules engine
   answers from the same results. Next-step buttons are always computed from data.
4. Per-user/IP hourly quota keeps LLM spend bounded at scale.

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

Ready in the code today (and in `infra/k8s`):

- Horizontal scaling of web, API and worker (stateless; outbox uses `SKIP LOCKED`).
- Read/write split (`DATABASE_REPLICA_URL`), connection pool limits, statement timeouts.
- Redis caching of hot reads with explicit invalidation; Next caches public pages.
- Async ingestion of high-volume writes; bulk inserts; partitioned event table.
- Idempotent writes and race-safe stock, coupons, seats, slots, quotes and claims — each verified by a concurrent test.
- Realtime fan-in scales per instance (§5b); media served from object storage/CDN.
- Prometheus `/metrics`: per-route latency histograms (route templates only), 5xx counters, DB pool gauges, outbox backlog, open SSE streams.
- Kubernetes: API/web/worker Deployments with HPA (API 3→60 pods), PDB, zone spread, graceful drain, migration PreSync job, SSE-safe ingress.
- `infra/load/k6-browse.js` with p95 thresholds for listing and search.

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
