# Blueprint coverage

How the code maps to the *Salamiyah City OS Master Blueprint* and the
*Revenue-First* financial document. ✅ built and tested · 🟡 partial · ⬜ not built.

## MVP-1 — Directory, search, profiles, news, jobs, marketplace, delivery
| Item | Status | Where |
|---|---|---|
| City/area/category model, multi-city ready | ✅ | `infrastructure/database/schema/geo.ts` |
| Directory, verification queue, public pages (SEO, share), city map | ✅ | `modules/directory`, `web/(site)/b`, `web/(site)/map` |
| Universal search: dialect intent engine, typo tolerance, stemming, zero-result intelligence | ✅ | `modules/search`, `modules/insights` |
| Phone OTP accounts (SMS / WhatsApp adapters), profiles | ✅ | `modules/auth`, `modules/users` |
| News + editor | ✅ | `modules/news`, `web/(site)/editor` |
| Jobs + applications | ✅ | `modules/jobs` |
| Marketplace: catalog, cart, orders (COD), stock, coupons, reorder | ✅ | `modules/catalog`, `modules/orders`, `modules/marketing` |
| Delivery for anything + courier board, earnings | ✅ | `modules/delivery`, `web/(site)/courier` |
| Event tracking (search → click → action) | ✅ | `modules/analytics` |

## MVP-2 — Merchant OS, CRM, Customer Connect, Booking
| Item | Status | Notes |
|---|---|---|
| Live orders, catalog, CSV import, images, settings | ✅ | `web/merchant` |
| Team & RBAC (8 roles), audit log | ✅ | `business-permissions.ts`, `audit_logs` |
| CRM: segments, revenue, top products, smart alerts | ✅ | `modules/insights` |
| Customer Connect (QR/link opt-in, revoke) + broadcasts | ✅ | `modules/marketing`, `web/(site)/connect` |
| Booking engine (doctors, courts, hotels, farms) | ✅ | `modules/bookings` |
| Multi-branch, per-branch stock, warehouse transfers | ⬜ | Model `branches` + `branch_stock` when the first multi-branch merchant signs |
| Customer CSV import | ⬜ | Deliberately replaced by consented QR/link joining (blueprint §8.1 privacy) |

## MVP-3 / MVP-4
| Item | Status |
|---|---|
| Provider OS: request → quotes → assignment → progress → review | ✅ |
| Hotels & seasonal farms (nightly booking), real estate with leads | ✅ |
| Events & trips with seats, QR tickets, check-in | ✅ |
| City Intelligence: KPIs, demand, zero results, opportunity engine | ✅ |
| AI City Assistant (grounded; Claude optional) + merchant smart insights | ✅ |
| Monetization: plans & limits, manual payment recording, featured placement, coupons | ✅ |
| Realtime updates (SSE) | ✅ |
| Online card / e-wallet payments | ⬜ — cash on delivery + manually recorded transfers today; add a payment-provider port when a Syrian provider is chosen |
| Native push notifications (FCM/APNs via Expo) | ✅ — `PushGateway` port, device registry, dead-token cleanup (`PUSH_PROVIDER=expo`) |
| Native iOS/Android app | ✅ — `apps/mobile` (Expo): citizen, merchant live orders, courier board; shares `@dari/contracts` |
| Zone-based dispatch / ETA / PostGIS nearest search | ⬜ — pull-based board today (ARCHITECTURE §7) |
| Seasonal marketplace collections (olive season, Eid) | 🟡 — expressible through categories, events and jobs; no dedicated "season" entity |
| Custom domains for merchant websites | ⬜ — every business has a shareable page + QR today |

## Production readiness checklist
- [ ] Choose and configure the SMS/WhatsApp OTP provider (adapters exist)
- [ ] Mobile release: EAS project id, app icons/splash, store listings, `PUSH_PROVIDER=expo` + `EXPO_ACCESS_TOKEN`, test on real iOS/Android devices
- [ ] Object storage bucket + CDN (`STORAGE_DRIVER=s3`)
- [ ] Managed Postgres (replica, PgBouncer, PITR), managed Redis
- [ ] Error tracking (Sentry) and dashboards/alerts on `/metrics`
- [ ] Run `infra/load/k6-browse.js` per scaling stage
- [ ] Legal review: Syrian personal data law No. 12 of 2024, terms, privacy policy
- [ ] Field validation of prices/fees (financial doc: numbers are illustrative)
