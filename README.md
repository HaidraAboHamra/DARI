# داري — DARI · City OS

**سلمية بين إيديك.** منصة مدينة رقمية تبدأ من سلمية وتتوسع إلى سوريا: دليل، بحث بلغة الناس، طلبات وتوصيل، أنظمة للتجار (Merchant OS)، وظائف، أخبار، وذكاء مدينة.

> A multi-city "City OS" super-app platform. Salamiyah is the pilot city; the city is a data dimension, not a hard-coded product.

---

## ما الموجود الآن · What's built

| الطبقة | المحتوى |
|---|---|
| **المواطن** (PWA) | الرئيسية «شو بدك اليوم؟»، بحث بالعامية مع فهم النية، استكشاف حسب القطاع، صفحات الأنشطة (اتصال/واتساب/موقع، مفتوح الآن، تقييمات)، سلة وطلب، تتبع الطلب، أخبار، وظائف والتقديم عليها، توصيل لأي شيء («اشترِ لي»، مستندات…)، الحساب والإشعارات |
| **Merchant OS** | تسجيل النشاط والتحقق، طلبات حية مع أزرار الحالة، الكتالوج والمخزون، CRM بشرائح الزبائن (جديد/وفي/VIP/معرّض للفقد/خامل)، الفريق والصلاحيات (RBAC)، الإعدادات |
| **المندوب** | لوحة مهام المدينة، استلام ذري (مندوب واحد فقط يحصل على المهمة)، تحديث الحالة ينعكس على الطلب |
| **الإدارة / ذكاء المدينة** | مؤشرات المدينة (North Star = احتياجات مُنجزة)، البحث بلا نتيجة، الأكثر بحثاً، محرك الفرص، طابور التحقق من الأنشطة |

## البنية · Architecture

```
apps/
  api/        NestJS + Fastify — modular monolith (HTTP) + background worker (same image)
  web/        Next.js 16 (App Router, RTL Arabic PWA) — BFF with httpOnly sessions
packages/
  contracts/  Shared domain: enums, zod schemas, types, Arabic text normalization,
              order state machine, opening hours — one source of truth for API + web
  tsconfig/   Shared compiler settings
```

PostgreSQL 16 (pg_trgm) · Redis (cache, rate limits, OTP, BullMQ queues) · Transactional outbox · Monthly-partitioned analytics.
Full design and the scaling plan: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · Blueprint coverage: **[docs/ROADMAP.md](docs/ROADMAP.md)**.

## التشغيل · Getting started

### Docker (everything)
```bash
docker compose up --build
# http://localhost:3000  (API: http://localhost:4000/health/ready)
```

### Local development
Requirements: Node 22+, pnpm 10, PostgreSQL 16, Redis 7.
```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # adjust DATABASE_URL / REDIS_URL
cp apps/web/.env.example apps/web/.env
pnpm --filter @dari/contracts build
pnpm db:migrate && pnpm db:seed             # demo data for Salamiyah
pnpm dev                                    # api :4000, worker, web :3000
```

### Demo accounts
Login is by phone + OTP. In development the code is always **123456**.

| الدور | الهاتف |
|---|---|
| Admin (ذكاء المدينة، التحقق) | `0900000001` |
| Merchant (مالك «مطعم الشام») | `0900000002` |
| Courier | `0900000003` |
| Editor (الأخبار) | `0900000004` |
| Citizen | `0900000005` |

> Seed businesses are illustrative placeholders, not verified real businesses.

### Quality gates
```bash
pnpm typecheck   # strict TypeScript everywhere
pnpm test        # unit + e2e against real Postgres/Redis (uses dari_test DB, Redis db 15)
pnpm build
```
CI runs the same three steps on every PR (`.github/workflows/ci.yml`).
