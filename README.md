# داري — DARI · City OS

**سلمية بين إيديك.** منصة مدينة رقمية تبدأ من سلمية وتتوسع إلى سوريا: بحث بلغة الناس، دليل وخريطة، طلبات وتوصيل لأي شيء، حجوزات، خدمات مهنية، فعاليات ورحلات بتذاكر، عقارات، وظائف، أخبار، نظام تشغيل للتجار (Merchant OS)، مساعد ذكي، وذكاء مدينة.

> A multi-city "City OS" super-app platform. Salamiyah is the pilot city; the city is a data dimension, not a hard-coded product.

---

## الميزات · Features

| الطبقة | المحتوى |
|---|---|
| **المواطن** (PWA + تطبيق موبايل iOS/Android بمقدمة الهوية المتحركة) | «شو بدك اليوم؟»، بحث بالعامية يفهم النية والاستعجال ويتحمل الأخطاء الإملائية، استكشاف حسب القطاع، خريطة المدينة، صفحات الأنشطة (اتصال/واتساب/موقع، مفتوح الآن، عروض، تقييمات تفصيلية، متابعة، مفضلة)، تحديد الموقع الدقيق (GPS) وسعر توصيل حسب المسافة يحدده الأدمن، خريطة سلمية الحية ثلاثية الأبعاد (أنشطة، فعاليات، عقارات، أخبار)، «داري للطعام»: صور المطاعم والأطباق، خيارات الطبق (الحجم/الإضافات/الحرارة) وملاحظة للمطبخ، الحد الأدنى للطلب ووقت التوصيل المتوقع، «الأكثر طلباً»، عروض المدينة، سلة وطلب مع كوبونات، تتبع الطلب لحظياً، «اطلب مجدداً»، حجز مواعيد/ملاعب/فنادق/مزارع، طلب خدمة مهنية واستلام عروض أسعار، فعاليات ورحلات بتذاكر QR، عقارات مع طلب معاينة، وظائف والتقديم عليها، توصيل لأي شيء، أخبار المدينة، مساعد المدينة الذكي، إشعارات فورية |
| **Merchant OS** | تسجيل النشاط والتحقق، طلبات حية مع أزرار الحالة، الكتالوج والمخزون واستيراد CSV، الحجوزات والموارد، طلبات الخدمة وعروض الأسعار، CRM بشرائح الزبائن، Customer Connect (QR بموافقة) ورسائل للمتابعين، الكوبونات، الباقة والاستخدام، الفريق والصلاحيات (8 أدوار)، تنبيهات ذكية، صور الشعار والغلاف والمنتجات |
| **المندوب** | لوحة مهام المدينة لحظياً، استلام ذري (مندوب واحد فقط)، تحديث الحالة ينعكس على الطلب، كشف أرباح ومؤشرات جودة |
| **الإدارة / ذكاء المدينة** | مؤشرات المدينة (North Star = احتياجات مُنجزة)، البحث بلا نتيجة، الأكثر بحثاً، محرك الفرص، طابور التحقق، تسجيل دفعات الاشتراك، الظهور المميز، أدوار الفريق، محرر الأخبار |

## البنية · Architecture

```
apps/
  api/        NestJS + Fastify — modular monolith (HTTP) + background worker (same image)
  web/        Next.js 16 (App Router, RTL Arabic PWA) — BFF with httpOnly sessions
  mobile/     Expo + React Native app (iOS/Android) — citizen, merchant live orders, courier
packages/
  contracts/  Shared domain: enums, zod schemas, types, Arabic text normalization,
              order/booking state machines, availability, plans, coupons — one source of truth
  tsconfig/   Shared compiler settings
infra/
  k8s/        Deployments, HPA, PDB, ingress (SSE-ready), migration job
  load/       k6 load test
```

PostgreSQL 16 (pg_trgm) · Redis (cache, rate limits, OTP, pub/sub, BullMQ) · Transactional outbox · Server-Sent Events · Monthly-partitioned analytics · S3-compatible media · Prometheus metrics.
Design and scaling plan: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · Blueprint coverage: **[docs/ROADMAP.md](docs/ROADMAP.md)**.

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

Optional: set `ANTHROPIC_API_KEY` to let Claude phrase the City AI assistant's answers (it is grounded in Dari's own search results; without a key a rules engine answers). Production OTP delivery: `SMS_PROVIDER=http|whatsapp` (see `apps/api/.env.example`).

### Mobile app (Expo)
```bash
cp apps/mobile/.env.example apps/mobile/.env
# On a real phone set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.20:4000/api/v1
pnpm --filter @dari/mobile start      # scan the QR with Expo Go, or press a / i for emulators
pnpm --filter @dari/mobile web        # browser preview (add http://localhost:8081 to the API's CORS_ORIGINS)
```
Push notifications need an EAS project (`eas init`) and `PUSH_PROVIDER=expo` on the API. Store builds: `eas build -p android|ios`.

**Test APK (no Expo account needed):** with the Android SDK installed (`ANDROID_HOME`), run
`pnpm --filter @dari/mobile apk:test` → `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
Test builds show a «عنوان الخادم» box on the login screen (and open it on first launch), so one APK works
against any server; they also allow plain-HTTP servers. Store builds have neither.

**Shared VPS with nginx (e.g. next to other sites):** one command, run as root on the server — it adds only
`/opt/dari`, the Docker stack `dari` and the nginx site `dari-ip` on port 8086, and is safe to re-run for updates:
```bash
curl -fsSL https://raw.githubusercontent.com/HaidraAboHamra/DARI/ccr-78982c29-ug2t1b/deploy/vps/install.sh | sudo bash
```

**Test server for the APK:** on any Linux VPS with Docker:
```bash
git clone <repo> dari && cd dari
PUBLIC_API_URL=http://<server-ip>:4000 JWT_SECRET=$(openssl rand -hex 32) docker compose up -d --build
```
Open port 4000 (API) and 3000 (website) in the firewall, then type `<server-ip>:4000` in the app.
The compose stack runs in development mode with the demo OTP code `123456` — fine for testing, never for real users.

### Demo accounts
Login is by phone + OTP. In development the code is always **123456**.

| الدور | الهاتف |
|---|---|
| Admin (ذكاء المدينة، التحقق، الاشتراكات) | `0900000001` |
| Merchant (مالك «مطعم الشام») | `0900000002` |
| Courier | `0900000003` |
| Editor (الأخبار) | `0900000004` |
| Citizen | `0900000005` |

> Seed businesses, events and listings are illustrative placeholders, not verified real entities.

### Quality gates
```bash
pnpm typecheck   # strict TypeScript everywhere
pnpm test        # unit + e2e against real Postgres/Redis (dari_test DB, Redis db 15)
pnpm build
```
CI runs the same three steps on every PR (`.github/workflows/ci.yml`).
