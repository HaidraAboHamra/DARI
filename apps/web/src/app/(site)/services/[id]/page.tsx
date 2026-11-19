import type { ServiceRequest } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AcceptQuoteButton, CancelRequestButton } from '@/components/services/service-actions';
import { buttonClass } from '@/components/ui/button';
import { CheckIcon, PhoneIcon } from '@/components/ui/icons';
import { Badge, PageHeader, SectionHeader, Stars } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { SERVICE_STATUS_LABEL, URGENCY_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'طلب خدمة' };
const STEPS = ['open', 'assigned', 'on_the_way', 'arrived', 'completed'] as const;

export default async function ServiceRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/services/${id}`);
  const request = await apiOrNull<ServiceRequest>(`/service-requests/${id}`);
  if (!request) notFound();
  const reached = STEPS.indexOf(request.status as (typeof STEPS)[number]);
  const pendingQuotes = request.quotes.filter((q) => q.status === 'pending').sort((a, b) => a.priceMin - b.priceMin);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={request.categoryName} subtitle={`${request.number} · ${URGENCY_LABEL[request.urgency]} · ${timeAgo(request.createdAt)}`}>
        {(request.status === 'open' || request.status === 'assigned') && <CancelRequestButton requestId={request.id} />}
      </PageHeader>
      <p className="card p-4 leading-relaxed">{request.description}</p>

      {request.status === 'cancelled' ? (
        <p className="text-center font-display text-xl font-bold text-danger">{SERVICE_STATUS_LABEL.cancelled}</p>
      ) : (
        <ol className="card flex flex-col gap-3 p-5" aria-label="مراحل الطلب">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${i <= reached ? 'bg-gold text-navy' : 'border border-sand text-muted'}`}>{i < reached ? <CheckIcon className="h-4 w-4" /> : i + 1}</span>
              <span className={i === reached ? 'font-bold text-navy' : i < reached ? '' : 'text-muted'}>{SERVICE_STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}

      {request.provider && (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted">مقدم الخدمة</p>
            <Link href={`/b/${request.provider.slug}`} className="font-display text-lg font-bold text-navy hover:underline">{request.provider.name}</Link>
            {request.finalPrice !== null && <p className="text-sm">السعر النهائي: <strong>{money(request.finalPrice)}</strong></p>}
          </div>
          <div className="flex gap-2">
            {request.provider.phone && <a href={`tel:${request.provider.phone}`} className={buttonClass('primary', 'sm')}><PhoneIcon className="h-4 w-4" /> اتصال</a>}
            {request.status === 'completed' && <Link href={`/b/${request.provider.slug}`} className={buttonClass('secondary', 'sm')}>قيّم الخدمة</Link>}
          </div>
        </section>
      )}

      {request.status === 'open' && (
        <section>
          <SectionHeader title={`عروض الأسعار (${pendingQuotes.length})`} />
          {pendingQuotes.length === 0 ? (
            <p className="card p-5 text-center text-muted">أرسلنا طلبك لمقدمي الخدمة المناسبين. تظهر العروض هنا فور وصولها.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingQuotes.map((q, i) => (
                <li key={q.id} className="card flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/b/${q.businessSlug}`} className="font-bold text-navy hover:underline">{q.businessName}</Link>
                    {i === 0 && <Badge tone="gold">الأرخص</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-semibold text-gold-deep">{money(q.priceMin)} – {money(q.priceMax)}</span>
                    <span className="text-muted">يصل خلال {q.etaMinutes} دقيقة</span>
                    <Stars value={q.ratingAvg} />
                  </div>
                  {q.message && <p className="text-sm text-muted">{q.message}</p>}
                  <AcceptQuoteButton requestId={request.id} quoteId={q.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
