import type { Order, Page } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { ORDER_STATUS_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'طلباتي' };

export default async function OrdersPage() {
  await requireUser('/orders');
  const orders = await api<Page<Order>>('/orders', { query: { limit: 30 } });
  return (
    <>
      <PageHeader title="طلباتي" />
      {orders.items.length === 0 ? (
        <EmptyState title="لا توجد طلبات بعد">
          <ButtonLink href="/explore/food">اطلب أول طلب</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.items.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card flex items-center justify-between gap-4 p-4 hover:shadow-lg">
                <div>
                  <p className="font-bold text-navy">{o.businessName}</p>
                  <p className="text-sm text-muted">
                    <span dir="ltr">{o.number}</span> · {timeAgo(o.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={o.status === 'delivered' || o.status === 'picked_up' ? 'success' : o.status === 'cancelled' || o.status === 'rejected' ? 'danger' : 'gold'}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </Badge>
                  <span className="font-semibold">{money(o.total, o.currency)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
