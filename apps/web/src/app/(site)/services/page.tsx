import type { Page, ServiceRequest } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { SERVICE_STATUS_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'طلبات الخدمات' };

export default async function MyServiceRequestsPage() {
  await requireUser('/services');
  const page = await api<Page<ServiceRequest>>('/service-requests', { query: { limit: 30 } });
  return (
    <>
      <PageHeader title="طلبات الخدمات" subtitle="سباكة، كهرباء، تكييف، تنظيف وغيرها">
        <ButtonLink href="/services/new">طلب خدمة جديد</ButtonLink>
      </PageHeader>
      {page.items.length === 0 ? (
        <EmptyState title="لا طلبات بعد" hint="اطلب خدمة واستلم عروض أسعار من مقدمي الخدمة في سلمية." />
      ) : (
        <ul className="flex flex-col gap-3">
          {page.items.map((r) => (
            <li key={r.id}>
              <Link href={`/services/${r.id}`} className="card flex items-center justify-between gap-4 p-4 hover:shadow-lg">
                <div className="min-w-0">
                  <p className="font-bold text-navy">{r.categoryName}</p>
                  <p className="truncate text-sm text-muted">{r.description} · {timeAgo(r.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'gold'}>{SERVICE_STATUS_LABEL[r.status]}</Badge>
                  {r.status === 'open' && <span className="text-xs text-muted">{r.quotes.length} عرض</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
