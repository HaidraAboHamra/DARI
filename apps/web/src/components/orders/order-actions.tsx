'use client';

import type { OrderStatus } from '@dari/contracts';
import { useState, useTransition } from 'react';
import { changeOrderStatus } from '@/actions/orders';
import { Button } from '@/components/ui/button';
import { ORDER_ACTION_LABEL } from '@/lib/labels';

const DESTRUCTIVE: ReadonlySet<OrderStatus> = new Set(['cancelled', 'rejected']);

/** Buttons for exactly the transitions the shared state machine allows. */
export function OrderActions({ orderId, actions, path }: { orderId: string; actions: OrderStatus[]; path: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (status: OrderStatus) =>
    start(async () => {
      if (DESTRUCTIVE.has(status) && !confirm(`تأكيد: ${ORDER_ACTION_LABEL[status]}؟`)) return;
      const result = await changeOrderStatus(orderId, status, path);
      setError(result.error ?? null);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((s) => (
        <Button key={s} size="sm" variant={DESTRUCTIVE.has(s) ? 'danger' : 'primary'} disabled={pending} onClick={() => run(s)}>
          {ORDER_ACTION_LABEL[s] ?? s}
        </Button>
      ))}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
