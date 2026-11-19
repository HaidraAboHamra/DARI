import type { DeliveryTask, Page } from '@dari/contracts';
import type { Metadata } from 'next';
import { cancelDelivery } from '@/actions/community';
import { ButtonLink } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { DELIVERY_STATUS_LABEL, DELIVERY_TYPE_LABEL } from '@/lib/labels';
import { currentUser } from '@/lib/session';
import { DeliveryForm } from './delivery-form';

export const metadata: Metadata = { title: 'توصيل' };

export default async function DeliveryPage() {
  const user = await currentUser();
  const mine = user ? await api<Page<DeliveryTask>>('/deliveries', { query: { limit: 10 } }) : null;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div>
        <PageHeader title="توصيل لأي شي" subtitle="مش بس أكل: أغراض، مستندات، «اشترِ لي» من أي محل بسلمية." />
        {user ? (
          <DeliveryForm />
        ) : (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <p className="font-semibold text-navy">سجّل دخولك لطلب مندوب</p>
            <ButtonLink href="/login?next=/delivery">دخول</ButtonLink>
          </div>
        )}
      </div>
      {mine && (
        <aside>
          <SectionHeader title="طلبات التوصيل" />
          <ul className="flex flex-col gap-3">
            {mine.items.map((t) => (
              <li key={t.id} className="card flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy">{DELIVERY_TYPE_LABEL[t.type]}</span>
                  <Badge tone={t.status === 'delivered' ? 'success' : t.status === 'cancelled' || t.status === 'failed' ? 'danger' : 'gold'}>
                    {DELIVERY_STATUS_LABEL[t.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted">{t.pickup.text} ← {t.dropoff.text}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>{money(t.fee)} · {timeAgo(t.createdAt)}</span>
                  {t.status === 'requested' && !t.orderId && (
                    <form action={cancelDelivery.bind(null, t.id)}>
                      <SubmitButton size="sm" variant="ghost">إلغاء</SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
            {mine.items.length === 0 && <p className="text-sm text-muted">لا توجد طلبات بعد.</p>}
          </ul>
        </aside>
      )}
    </div>
  );
}
