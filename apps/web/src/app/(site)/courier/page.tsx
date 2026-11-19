import type { DeliveryTask, Page } from '@dari/contracts';
import type { Metadata } from 'next';
import { AutoRefresh } from '@/components/shell/auto-refresh';
import { Badge, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { money, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { DELIVERY_STATUS_LABEL, DELIVERY_TYPE_LABEL } from '@/lib/labels';
import { AdvanceButton, ClaimButton } from './task-actions';

export const metadata: Metadata = { title: 'لوحة المندوب' };

function TaskCard({ task, children }: { task: DeliveryTask; children: React.ReactNode }) {
  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-navy">{DELIVERY_TYPE_LABEL[task.type]}</span>
        <Badge tone="gold">{money(task.fee)}</Badge>
      </div>
      {task.itemDescription && <p className="text-sm">{task.itemDescription}</p>}
      <p className="text-sm text-muted">من: {task.pickup.text}{task.pickup.contactPhone && <> · <a dir="ltr" href={`tel:${task.pickup.contactPhone}`}>{task.pickup.contactPhone}</a></>}</p>
      <p className="text-sm text-muted">إلى: {task.dropoff.text}{task.dropoff.contactPhone && <> · <a dir="ltr" href={`tel:${task.dropoff.contactPhone}`}>{task.dropoff.contactPhone}</a></>}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{timeAgo(task.createdAt)} · {DELIVERY_STATUS_LABEL[task.status]}</span>
        {children}
      </div>
    </li>
  );
}

export default async function CourierPage() {
  await requireUser('/courier', ['courier']);
  const [board, mine] = await Promise.all([
    api<Page<DeliveryTask>>('/deliveries/board', { query: { city: config.city, limit: 30 } }),
    api<Page<DeliveryTask>>('/deliveries/assigned', { query: { limit: 30 } }),
  ]);
  const active = mine.items.filter((t) => t.status === 'assigned' || t.status === 'picked_up');

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh seconds={10} />
      <PageHeader title="لوحة المندوب" subtitle="المهام المتاحة في سلمية — أول من يستلم يحصل على المهمة" />
      <section>
        <SectionHeader title={`مهامي الحالية (${active.length})`} />
        {active.length === 0 ? <p className="text-sm text-muted">لا مهام جارية.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {active.map((t) => <TaskCard key={t.id} task={t}><AdvanceButton taskId={t.id} status={t.status} /></TaskCard>)}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader title={`مهام متاحة (${board.items.length})`} />
        {board.items.length === 0 ? <EmptyState title="لا مهام متاحة الآن" hint="تتحدث اللوحة تلقائياً." /> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {board.items.map((t) => <TaskCard key={t.id} task={t}><ClaimButton taskId={t.id} /></TaskCard>)}
          </ul>
        )}
      </section>
    </div>
  );
}
