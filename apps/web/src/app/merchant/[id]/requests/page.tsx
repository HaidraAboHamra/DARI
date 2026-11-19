import type { Page, ServiceRequest } from '@dari/contracts';
import { AdvanceServiceButton } from '@/components/services/service-actions';
import { Badge, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { SERVICE_STATUS_LABEL, URGENCY_LABEL } from '@/lib/labels';
import { QuoteForm } from './quote-form';

const NEXT: Record<string, 'on_the_way' | 'arrived' | 'completed'> = { assigned: 'on_the_way', on_the_way: 'arrived', arrived: 'completed' };

export default async function ProviderRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inbox = await api<Page<ServiceRequest>>('/provider/requests', { query: { businessId: id, limit: 50 } });
  const open = inbox.items.filter((r) => r.status === 'open');
  const jobs = inbox.items.filter((r) => r.status !== 'open');
  const path = `/merchant/${id}/requests`;

  return (
    <div className="flex flex-col gap-8">

      <section>
        <SectionHeader title={`أعمالي (${jobs.filter((j) => NEXT[j.status]).length} جارية)`} />
        {jobs.length === 0 ? <p className="text-sm text-muted">لا أعمال بعد. عندما يختار زبون عرضك يظهر هنا مع رقمه وعنوانه.</p> : (
          <ul className="flex flex-col gap-3">
            {jobs.map((r) => (
              <li key={r.id} className="card flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy">{r.categoryName} · <span dir="ltr">{r.number}</span></span>
                  <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'gold'}>{SERVICE_STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="text-sm">{r.description}</p>
                <p className="text-sm text-muted">{r.customerName ?? 'زبون'} · {r.address} {r.customerPhone && <>· <a dir="ltr" className="font-semibold text-navy" href={`tel:${r.customerPhone}`}>{r.customerPhone}</a></>}</p>
                {r.finalPrice !== null && <p className="text-sm">السعر النهائي: {money(r.finalPrice)}</p>}
                {NEXT[r.status] && <AdvanceServiceButton requestId={r.id} next={NEXT[r.status]!} path={path} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title={`طلبات جديدة في اختصاصك (${open.length})`} />
        {open.length === 0 ? <EmptyState title="لا طلبات مفتوحة الآن" hint="تصلك إشعارات فور وصول طلب في تصنيف نشاطك." /> : (
          <ul className="flex flex-col gap-3">
            {open.map((r) => (
              <li key={r.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy">{r.categoryName}</span>
                  <Badge tone={r.urgency === 'now' ? 'danger' : 'neutral'}>{URGENCY_LABEL[r.urgency]}</Badge>
                </div>
                <p>{r.description}</p>
                <p className="text-sm text-muted">{r.areaName ?? r.address} · {timeAgo(r.createdAt)}</p>
                {r.quotes.length ? <p className="text-sm font-semibold text-success">أرسلت عرضاً: {money(r.quotes[0]!.priceMin)} – {money(r.quotes[0]!.priceMax)}</p> : <QuoteForm requestId={r.id} businessId={id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
