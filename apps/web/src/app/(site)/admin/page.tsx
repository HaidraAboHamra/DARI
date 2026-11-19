import { type BusinessDetail, type BusinessSummary, type CityKpis, type DemandInsight, type Page, VERTICAL_META, type Vertical } from '@dari/contracts';
import type { Metadata } from 'next';
import { setBusinessStatus } from '@/actions/merchant';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, EmptyState, PageHeader, SectionHeader, Stat } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { money, number, percent, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { FeatureForm, PaymentForm, RoleForm } from './admin-forms';

export const metadata: Metadata = { title: 'ذكاء المدينة' };

interface Opportunity {
  vertical: Vertical | null;
  searches: number;
  zeroResults: number;
  activeSupply: number;
  score: number;
}

export default async function AdminPage() {
  await requireUser('/admin', ['admin']);
  const q = { city: config.city, days: 7 };
  const [kpis, zero, top, opportunities, queue, revenue, directory] = await Promise.all([
    api<CityKpis>('/admin/insights/kpis', { query: q }),
    api<DemandInsight[]>('/admin/insights/demand', { query: { ...q, zeroOnly: true } }),
    api<DemandInsight[]>('/admin/insights/demand', { query: q }),
    api<Opportunity[]>('/admin/insights/opportunities', { query: { ...q, days: 30 } }),
    api<BusinessDetail[]>('/admin/businesses', { query: { status: 'pending_review' } }),
    api<{ subscriptionRevenue30d: number; payingBusinesses: number }>('/admin/revenue'),
    api<Page<BusinessSummary>>('/businesses', { query: { city: config.city, limit: 50 } }),
  ]);
  const options = directory.items.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="ذكاء المدينة" subtitle="ماذا تحتاج سلمية الآن؟ آخر 7 أيام" />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="احتياجات مُنجزة (North Star)" value={number(kpis.completedNeeds7d)} hint="طلبات مكتملة + تقديمات وظائف + توصيلات" />
        <Stat label="عمليات بحث" value={number(kpis.searches7d)} />
        <Stat label="بحث بلا نتيجة" value={percent(kpis.zeroResultRate7d)} hint="كل بحث فاشل = فرصة عمل" />
        <Stat label="طلبات" value={number(kpis.orders7d)} />
        <Stat label="قيمة المعاملات GMV" value={money(kpis.gmv7d)} />
        <Stat label="أنشطة فعّالة" value={number(kpis.activeBusinesses)} />
        <Stat label="إيراد الاشتراكات (30 يوم)" value={money(revenue.subscriptionRevenue30d)} />
        <Stat label="أنشطة مشتركة" value={number(revenue.payingBusinesses)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="طلب بلا عرض (Zero results)" />
          {zero.length === 0 ? (
            <EmptyState title="لا توجد فجوات مسجلة" />
          ) : (
            <ul className="card divide-y divide-sand/70">
              {zero.map((d) => (
                <li key={d.normalizedQuery} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-navy">{d.normalizedQuery}</p>
                    <p className="text-xs text-muted">{d.vertical ? VERTICAL_META[d.vertical].labelAr : 'غير مصنّف'} · {timeAgo(d.lastSearchedAt)}</p>
                  </div>
                  <Badge tone="danger">{number(d.zeroResults)} مرة</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SectionHeader title="الأكثر بحثاً" />
          <ul className="card divide-y divide-sand/70">
            {top.slice(0, 12).map((d) => (
              <li key={d.normalizedQuery} className="flex items-center justify-between p-4 text-sm">
                <span className="font-medium">{d.normalizedQuery}</span>
                <span className="tabular-nums text-muted">{number(d.searches)}</span>
              </li>
            ))}
            {top.length === 0 && <li className="p-4 text-sm text-muted">لا بيانات بعد.</li>}
          </ul>
        </div>
      </section>

      <section>
        <SectionHeader title="محرك الفرص — طلب مرتفع وعرض منخفض (30 يوم)" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-ivory text-right text-muted">
              <tr><th className="p-3">القطاع</th><th className="p-3">بحث</th><th className="p-3">بلا نتيجة</th><th className="p-3">العرض الحالي</th><th className="p-3">مؤشر الفرصة</th></tr>
            </thead>
            <tbody className="divide-y divide-sand/70">
              {opportunities.map((o) => (
                <tr key={o.vertical ?? 'none'}>
                  <td className="p-3 font-semibold">{o.vertical ? VERTICAL_META[o.vertical].labelAr : 'غير مصنّف'}</td>
                  <td className="p-3 tabular-nums">{number(o.searches)}</td>
                  <td className="p-3 tabular-nums">{number(o.zeroResults)}</td>
                  <td className="p-3 tabular-nums">{number(o.activeSupply)}</td>
                  <td className="p-3"><Badge tone={o.score >= 2 ? 'danger' : 'gold'}>{o.score}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">المؤشر استرشادي — يجب التحقق ميدانياً من الطلب قبل أي قرار تجاري.</p>
      </section>

      <section>
        <SectionHeader title={`طلبات التحقق (${queue.length})`} />
        {queue.length === 0 ? (
          <EmptyState title="لا توجد أنشطة بانتظار المراجعة" />
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.map((b) => (
              <li key={b.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy">{b.name}</p>
                  <p className="text-sm text-muted">{VERTICAL_META[b.vertical].labelAr} · {b.phone ?? 'بلا هاتف'} · {timeAgo(b.createdAt)}</p>
                </div>
                <form action={setBusinessStatus.bind(null, b.id, 'active')}><SubmitButton size="sm">تفعيل وتوثيق</SubmitButton></form>
                <form action={setBusinessStatus.bind(null, b.id, 'suspended')}><SubmitButton size="sm" variant="danger">رفض</SubmitButton></form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5"><SectionHeader title="تسجيل دفعة اشتراك" /><PaymentForm businesses={options} /></div>
        <div className="flex flex-col gap-6">
          <div className="card p-5"><SectionHeader title="ظهور مميز (إعلان)" /><FeatureForm businesses={options} /></div>
          <div className="card p-5"><SectionHeader title="أدوار الفريق (مندوب، محرر، مدير)" /><RoleForm /></div>
        </div>
      </section>
    </div>
  );
}
