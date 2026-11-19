import { type BusinessDetail, nextOrderStatuses, type Order, type Page, type SmartInsight, TERMINAL_ORDER_STATUSES } from '@dari/contracts';
import { OrderActions } from '@/components/orders/order-actions';
import { Badge, EmptyState, SectionHeader, Stat } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, number, timeAgo } from '@/lib/format';
import { ORDER_STATUS_LABEL, SEGMENT_LABEL } from '@/lib/labels';
import { SettingsForm } from './settings-form';

interface Overview {
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  averageOrderValue: number;
  customers: number;
  segments: Record<string, number>;
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
}

export default async function MerchantDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [business, orders, overview, insights] = await Promise.all([
    api<BusinessDetail>(`/merchant/businesses/${id}`),
    api<Page<Order>>(`/merchant/businesses/${id}/orders`, { query: { limit: 30 } }),
    api<Overview>(`/merchant/businesses/${id}/insights`).catch(() => null),
    api<SmartInsight[]>(`/merchant/businesses/${id}/smart-insights`).catch(() => []),
  ]);
  const live = orders.items.filter((o) => !TERMINAL_ORDER_STATUSES.has(o.status));
  const done = orders.items.filter((o) => TERMINAL_ORDER_STATUSES.has(o.status)).slice(0, 10);

  return (
    <div className="flex flex-col gap-8">

      {overview && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="مبيعات 30 يوم" value={money(overview.revenue)} />
          <Stat label="طلبات مكتملة" value={number(overview.completedOrders)} hint={`من ${number(overview.orders)} طلب`} />
          <Stat label="متوسط الطلب" value={money(overview.averageOrderValue)} />
          <Stat label="الزبائن" value={number(overview.customers)} hint={Object.entries(overview.segments).filter(([, n]) => n).map(([s, n]) => `${SEGMENT_LABEL[s]} ${n}`).join(' · ') || undefined} />
        </section>
      )}

      {insights.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="تنبيهات ذكية">
          {insights.map((i) => (
            <div
              key={i.kind}
              className={`rounded-[var(--radius-card)] border-s-4 bg-white p-4 shadow-[var(--shadow-card)] ${i.severity === 'critical' ? 'border-danger' : i.severity === 'warning' ? 'border-gold' : 'border-navy/40'}`}
            >
              <p className="font-semibold text-navy">✦ {i.title}</p>
              <p className="text-sm text-muted">{i.detail}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <SectionHeader title={`طلبات جارية (${live.length})`} />
        {live.length === 0 ? (
          <EmptyState title="لا طلبات جارية" hint="تتحدث الصفحة تلقائياً عند وصول طلب جديد." />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {live.map((o) => (
              <li key={o.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy" dir="ltr">{o.number}</span>
                  <Badge tone={o.status === 'pending' ? 'danger' : 'gold'}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {o.customerName ?? 'زبون'} · {o.fulfillment === 'delivery' ? `توصيل: ${o.address?.text ?? ''}` : 'استلام من المحل'} · {timeAgo(o.createdAt)}
                </p>
                <ul className="text-sm">
                  {o.items.map((i) => <li key={i.productId}>{i.quantity} × {i.name}</li>)}
                </ul>
                {o.notes && <p className="rounded-xl bg-champagne/30 px-3 py-2 text-sm">📝 {o.notes}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{money(o.total, o.currency)}</span>
                  <OrderActions orderId={o.id} actions={nextOrderStatuses(o.status, 'merchant', o.fulfillment)} path={`/merchant/${id}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview && overview.topProducts.length > 0 && (
        <section>
          <SectionHeader title="الأكثر مبيعاً" />
          <ul className="card divide-y divide-sand/70">
            {overview.topProducts.map((p) => (
              <li key={p.productId} className="flex justify-between p-4 text-sm">
                <span>{p.name}</span>
                <span className="text-muted">{number(p.quantity)} قطعة · {money(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <SectionHeader title="آخر الطلبات المنتهية" />
          <ul className="card divide-y divide-sand/70">
            {done.map((o) => (
              <li key={o.id} className="flex items-center justify-between p-4 text-sm">
                <span dir="ltr">{o.number}</span>
                <span className="text-muted">{timeAgo(o.updatedAt)}</span>
                <Badge tone={o.status === 'cancelled' || o.status === 'rejected' ? 'danger' : 'success'}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                <span className="font-semibold">{money(o.total, o.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader title="إعدادات النشاط" />
        <SettingsForm business={business} />
      </section>
    </div>
  );
}
