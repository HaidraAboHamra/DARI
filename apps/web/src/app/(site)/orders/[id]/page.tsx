import { nextOrderStatuses, type Order, type OrderStatus, type Product } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderActions } from '@/components/orders/order-actions';
import { ReorderButton } from '@/components/orders/reorder-button';
import { CheckIcon } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/primitives';
import { api, apiOrNull } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { ORDER_STATUS_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'تفاصيل الطلب' };

const FLOW: Record<'delivery' | 'pickup', OrderStatus[]> = {
  delivery: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
  pickup: ['pending', 'accepted', 'preparing', 'ready', 'picked_up'],
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const order = await apiOrNull<Order>(`/orders/${id}`);
  if (!order) notFound();

  const steps = FLOW[order.fulfillment];
  const reached = steps.indexOf(order.status);
  const ended = order.status === 'cancelled' || order.status === 'rejected';
  const customerActions = order.customerId === user.id ? nextOrderStatuses(order.status, 'customer', order.fulfillment) : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={order.businessName} subtitle={`طلب ${order.number} · ${timeAgo(order.createdAt)}`} />

      <section className="card p-5" aria-label="حالة الطلب">
        {ended ? (
          <p className="text-center font-display text-xl font-bold text-danger">{ORDER_STATUS_LABEL[order.status]}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${i <= reached ? 'bg-gold text-navy' : 'border border-sand text-muted'}`}>
                  {i < reached ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </span>
                <span className={i === reached ? 'font-bold text-navy' : i < reached ? 'text-ink' : 'text-muted'}>{ORDER_STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card divide-y divide-sand/70">
        {order.items.map((i) => (
          <div key={i.productId} className="flex justify-between p-4 text-sm">
            <span>{i.quantity} × {i.name}</span>
            <span className="font-semibold">{money(i.lineTotal, order.currency)}</span>
          </div>
        ))}
        <dl className="flex flex-col gap-1 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">المجموع</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success"><dt>الخصم</dt><dd>− {money(order.discount, order.currency)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">التوصيل</dt><dd>{money(order.deliveryFee, order.currency)}</dd></div>
          <div className="flex justify-between text-base font-bold text-navy"><dt>الإجمالي</dt><dd>{money(order.total, order.currency)}</dd></div>
        </dl>
      </section>
      {order.address && <p className="text-sm text-muted">📍 {order.address.text}</p>}
      {customerActions.length > 0 && <OrderActions orderId={order.id} actions={customerActions} path={`/orders/${order.id}`} />}
      {order.customerId === user.id && (order.status === 'delivered' || order.status === 'picked_up' || order.status === 'cancelled') && (
        <Reorder order={order} />
      )}
    </div>
  );
}

async function Reorder({ order }: { order: Order }) {
  const menu = await api<Product[]>(`/businesses/${order.businessId}/products`).catch(() => []);
  return <ReorderButton order={order} menu={menu} />;
}
