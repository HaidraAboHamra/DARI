# Blueprint coverage

How the code maps to the *Salamiyah City OS Master Blueprint* MVP phases (§19)
and the *Revenue-First* financial document. ✅ built and tested · 🟡 partial · ⬜ not yet.

## MVP-1 — Directory + Universal Search + Profiles + News + Jobs + basic Marketplace + delivery requests
| Item | Status | Where |
|---|---|---|
| City/area/category model, multi-city ready | ✅ | `apps/api/src/infrastructure/database/schema/geo.ts` |
| Business directory, verification queue, public pages (SEO, share) | ✅ | `modules/directory`, `web/app/(site)/b/[slug]` |
| Universal search, dialect intent engine, zero-result intelligence | ✅ | `modules/search`, `modules/insights` |
| Phone OTP accounts, profiles | ✅ | `modules/auth`, `modules/users` |
| News (editor role) | ✅ | `modules/news` |
| Job board + applications | ✅ | `modules/jobs` |
| Marketplace: catalog, cart, orders (COD), stock | ✅ | `modules/catalog`, `modules/orders` |
| Delivery requests (buy-for-me, documents, parcels), courier board | ✅ | `modules/delivery`, `web/app/(site)/courier` |
| Event tracking (search → click → action funnel) | ✅ | `modules/analytics`, `web/components/analytics` |

## MVP-2 — Merchant OS basics + CRM + Customer Connect + Booking
| Item | Status | Notes |
|---|---|---|
| Merchant console: live orders, catalog, settings | ✅ | `web/app/merchant` |
| Team & RBAC (8 roles) + audit log | ✅ | `business-permissions.ts`, `audit_logs` |
| CRM: customers, segments, top products, revenue | ✅ | `modules/insights` |
| Customer Connect (QR/link opt-in, consent records) | 🟡 | Table + consent fields exist (`customer_relationships.consented_at`); QR join flow UI/endpoint not built |
| CSV import assistant | ⬜ | |
| Multi-branch, warehouses, stock transfers | ⬜ | Model `branches` when the first multi-branch merchant signs |
| Booking engine (doctors, courts, hotels, farms) | ⬜ | Next major module: resources + availability slots + bookings |

## MVP-3 / MVP-4
| Item | Status |
|---|---|
| Provider OS (service requests: plumber flow §9.1) | ⬜ — today providers are listed/contacted; request→accept→complete flow is next |
| Hotels / properties / seasonal farms / events & trips with seats | ⬜ (verticals, categories and directory pages exist) |
| AI City Assistant | 🟡 — rule-based intent engine in place behind a swappable classifier; LLM assistant can plug in on top of real data |
| City Intelligence dashboards | ✅ KPIs, demand, zero results, opportunity engine |
| Payments (beyond cash on delivery), subscriptions/billing, ads/featured listings | ⬜ |
| Native mobile apps | ⬜ — the PWA installs on phones; React Native/Expo can reuse `@dari/contracts` |

## Production readiness checklist
- [ ] Real SMS/WhatsApp OTP provider (implement `SmsGateway`)
- [ ] Image upload to object storage + CDN
- [ ] Managed Postgres (replica, PgBouncer, PITR), managed Redis
- [ ] Observability: Sentry, OpenTelemetry metrics/traces, uptime alerts
- [ ] Load tests (k6) per scaling stage — see ARCHITECTURE §7
- [ ] Legal review: Syrian personal data law No. 12 of 2024, terms, privacy policy
